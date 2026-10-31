import crypto from "crypto";
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";
import { Prisma } from "../../generated";
import { DEFAULT_DEFINITIONS } from "./workflow.defaults";
import { getWorkflowHandler, WorkflowInstanceView } from "./workflow.registry";

const bad = (msg: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, msg);
const forbid = (msg: string) => new AppError(ErrorCode.FORBIDDEN, 403, msg);
const notFound = (msg: string) => new AppError(ErrorCode.NOT_FOUND, 404, msg);

export interface WfContext {
  userId: string;
  branchId?: string | null;
  perms: string[];
}
export interface WfMeta {
  ip?: string;
  userAgent?: string;
}

type Tx = Prisma.TransactionClient;
type StepRow = {
  id: string;
  instanceId: string;
  order: number;
  name: string;
  approverPermission: string;
  branchScoped: boolean;
  escalateAfterHours: number | null;
  escalateToPermission: string | null;
  status: string;
  dueAt: Date | null;
  escalatedAt: Date | null;
  actedById: string | null;
  onBehalfOfId: string | null;
  actedAt: Date | null;
  comment: string | null;
};
type InstRow = {
  id: string;
  instanceNumber: string;
  definitionCode: string;
  entityType: string;
  entityId: string;
  title: string;
  amount: number | null;
  branchId: string | null;
  requestedById: string;
  status: string;
  payload: unknown;
};
interface Actor {
  id: string;
  perms: string[];
  branchId: string | null;
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const view = (i: InstRow): WorkflowInstanceView => ({
  id: i.id,
  instanceNumber: i.instanceNumber,
  definitionCode: i.definitionCode,
  entityType: i.entityType,
  entityId: i.entityId,
  title: i.title,
  amount: i.amount,
  branchId: i.branchId,
  requestedById: i.requestedById,
  payload: i.payload,
});

export class WorkflowService {
  // ------------------------------------------------------------- definitions

  private async ensureDefinition(code: string) {
    const existing = await prisma.workflowDefinition.findUnique({ where: { code } });
    if (existing) return existing;
    const seed = DEFAULT_DEFINITIONS.find((d) => d.code === code);
    if (!seed) throw bad(`Unknown workflow "${code}".`);
    return prisma.$transaction(async (tx) => {
      const def = await tx.workflowDefinition.create({
        data: { code: seed.code, name: seed.name, description: seed.description, entityType: seed.entityType },
      });
      await tx.workflowStage.createMany({
        data: seed.stages.map((s) => ({
          definitionId: def.id,
          order: s.order,
          name: s.name,
          approverPermission: s.approverPermission,
          branchScoped: s.branchScoped ?? false,
          minAmount: s.minAmount ?? null,
          escalateAfterHours: s.escalateAfterHours ?? null,
          escalateToPermission: s.escalateToPermission ?? null,
        })),
      });
      return def;
    });
  }

  async listDefinitions() {
    for (const d of DEFAULT_DEFINITIONS) await this.ensureDefinition(d.code);
    const defs = await prisma.workflowDefinition.findMany({ orderBy: { name: "asc" } });
    const stages = await prisma.workflowStage.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
    return defs.map((d) => ({ ...d, stages: stages.filter((s) => s.definitionId === d.id) }));
  }

  async updateDefinition(
    code: string,
    d: {
      name?: string;
      description?: string;
      isActive?: boolean;
      stages?: {
        order: number;
        name: string;
        approverPermission: string;
        branchScoped?: boolean;
        minAmount?: number | null;
        escalateAfterHours?: number | null;
        escalateToPermission?: string | null;
      }[];
    },
  ) {
    const def = await this.ensureDefinition(code);
    if (d.stages) {
      if (!d.stages.length) throw bad("A workflow needs at least one stage.");
      const codes = new Set<string>();
      for (const s of d.stages) {
        if (!s.name?.trim()) throw bad("Every stage needs a name.");
        if (!Number.isInteger(s.order) || s.order < 1) throw bad("Stage order must be 1 or higher.");
        if (s.minAmount != null && !(s.minAmount >= 0)) throw bad("Minimum amount cannot be negative.");
        if (s.escalateAfterHours != null && !(s.escalateAfterHours > 0)) throw bad("Escalation hours must be above zero.");
        codes.add(s.approverPermission);
        if (s.escalateToPermission) codes.add(s.escalateToPermission);
      }
      const known = await prisma.permission.findMany({ where: { code: { in: [...codes] } }, select: { code: true } });
      const missing = [...codes].filter((c) => !known.some((k) => k.code === c));
      if (missing.length) throw bad(`Unknown permission: ${missing.join(", ")}.`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.workflowDefinition.update({
        where: { id: def.id },
        data: {
          ...(d.name?.trim() && { name: d.name.trim() }),
          ...(d.description !== undefined && { description: d.description?.trim() || null }),
          ...(d.isActive !== undefined && { isActive: d.isActive }),
        },
      });
      if (d.stages) {
        await tx.workflowStage.deleteMany({ where: { definitionId: def.id } });
        await tx.workflowStage.createMany({
          data: d.stages.map((s) => ({
            definitionId: def.id,
            order: s.order,
            name: s.name.trim(),
            approverPermission: s.approverPermission,
            branchScoped: !!s.branchScoped,
            minAmount: s.minAmount ?? null,
            escalateAfterHours: s.escalateAfterHours ?? null,
            escalateToPermission: s.escalateToPermission || null,
          })),
        });
      }
    });
    return (await this.listDefinitions()).find((x) => x.code === code);
  }

  // ------------------------------------------------------------------ events

  /** Appends to the trail. Each row hashes the one before it, so tampering shows. */
  private async addEvent(
    tx: Tx,
    e: {
      instanceId: string;
      stepId?: string | null;
      action: string;
      actorId: string;
      onBehalfOfId?: string | null;
      comment?: string | null;
      meta?: WfMeta;
    },
  ) {
    const last = await tx.workflowEvent.findFirst({
      where: { instanceId: e.instanceId },
      orderBy: { createdAt: "desc" },
      select: { hash: true, createdAt: true },
    });
    const now = Date.now();
    const createdAt = new Date(last && last.createdAt.getTime() >= now ? last.createdAt.getTime() + 1 : now);
    const prevHash = last?.hash ?? null;
    const hash = sha(
      [prevHash ?? "", e.instanceId, e.stepId ?? "", e.action, e.actorId, e.onBehalfOfId ?? "", e.comment ?? "", createdAt.toISOString()].join("|"),
    );
    return tx.workflowEvent.create({
      data: {
        instanceId: e.instanceId,
        stepId: e.stepId ?? null,
        action: e.action,
        actorId: e.actorId,
        onBehalfOfId: e.onBehalfOfId ?? null,
        comment: e.comment?.trim() || null,
        ipAddress: e.meta?.ip ?? null,
        userAgent: e.meta?.userAgent?.slice(0, 300) ?? null,
        prevHash,
        hash,
        createdAt,
      },
    });
  }

  // -------------------------------------------------------- people / actors

  private async loadActors(ctx: WfContext): Promise<Actor[]> {
    const now = new Date();
    const delegations = await prisma.workflowDelegation.findMany({
      where: { toUserId: ctx.userId, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      select: { fromUserId: true },
    });
    const actors: Actor[] = [{ id: ctx.userId, perms: ctx.perms, branchId: ctx.branchId ?? null }];
    if (!delegations.length) return actors;
    const { PermissionService } = await import("../auth/services/permission.service");
    for (const fromUserId of new Set(delegations.map((x) => x.fromUserId))) {
      const [perms, u] = await Promise.all([
        PermissionService.getUserPermissions(fromUserId),
        prisma.user.findUnique({ where: { id: fromUserId }, select: { branchId: true } }),
      ]);
      actors.push({ id: fromUserId, perms, branchId: u?.branchId ?? null });
    }
    return actors;
  }

  private priorApprovers(steps: StepRow[]): Set<string> {
    const s = new Set<string>();
    for (const st of steps) {
      if (st.status !== "APPROVED") continue;
      if (st.actedById) s.add(st.actedById);
      if (st.onBehalfOfId) s.add(st.onBehalfOfId);
    }
    return s;
  }

  /** Can one of the caller's identities (self or someone who delegated to them) decide this step? */
  private canAct(
    step: StepRow,
    inst: InstRow,
    actors: Actor[],
    prior: Set<string>,
  ): { ok: boolean; onBehalfOfId?: string; reason: string } {
    let reason = "You do not hold the permission this stage needs.";
    for (const a of actors) {
      const holds =
        a.perms.includes(step.approverPermission) ||
        (!!step.escalatedAt && !!step.escalateToPermission && a.perms.includes(step.escalateToPermission));
      if (!holds) continue;
      if (a.id === inst.requestedById) {
        reason = "Segregation of Duties: you cannot approve a request you raised.";
        continue;
      }
      if (prior.has(a.id)) {
        reason = "Segregation of Duties: you already approved an earlier stage of this request.";
        continue;
      }
      if (step.branchScoped && inst.branchId && !a.perms.includes("org.branches.view_all") && a.branchId !== inst.branchId) {
        reason = "This stage must be approved by someone in the branch that raised the request.";
        continue;
      }
      return { ok: true, onBehalfOfId: a.id === actors[0].id ? undefined : a.id, reason: "" };
    }
    return { ok: false, reason };
  }

  private async attachUsers<T extends Record<string, any>>(rows: T[], keys: string[]) {
    const ids = new Set<string>();
    for (const r of rows) for (const k of keys) if (r[k] && r[k] !== "system") ids.add(r[k]);
    const users = ids.size
      ? await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true, email: true } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const extra: Record<string, unknown> = {};
      for (const k of keys) extra[k.replace(/Id$/, "")] = r[k] ? (byId.get(r[k]) ?? null) : null;
      return { ...r, ...extra };
    });
  }

  /** Everyone who could act on a step right now: holders of the permission (in-branch if scoped) plus their delegates. */
  private async approverIds(permission: string, branchId: string | null, branchScoped: boolean): Promise<string[]> {
    const assignments = await prisma.roleAssignment.findMany({
      where: {
        user: { isActive: true },
        role: { permissions: { some: { permission: { code: permission } } } },
      },
      select: { userId: true, user: { select: { branchId: true } } },
    });
    let ids = [...new Set(assignments.map((a) => a.userId))];
    if (branchScoped && branchId) {
      const cross = await prisma.roleAssignment.findMany({
        where: { role: { permissions: { some: { permission: { code: "org.branches.view_all" } } } } },
        select: { userId: true },
      });
      const crossIds = new Set(cross.map((c) => c.userId));
      const inBranch = new Set(assignments.filter((a) => a.user?.branchId === branchId).map((a) => a.userId));
      ids = ids.filter((id) => inBranch.has(id) || crossIds.has(id));
    }
    if (ids.length) {
      const now = new Date();
      const delegates = await prisma.workflowDelegation.findMany({
        where: { fromUserId: { in: ids }, isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
        select: { toUserId: true },
      });
      ids = [...new Set([...ids, ...delegates.map((d) => d.toUserId)])];
    }
    return ids;
  }

  private async notify(userIds: string[], title: string, message: string, exclude: string[] = []) {
    const targets = [...new Set(userIds)].filter((id) => !exclude.includes(id));
    if (!targets.length) return;
    try {
      await prisma.notification.createMany({
        data: targets.map((userId) => ({ userId, title, message, type: "APPROVAL", link: "/dashboard/approvals" })),
      });
    } catch (err) {
      logger.error({ err }, "Workflow notification failed");
    }
  }

  private async notifyStepsActivated(inst: InstRow, steps: { approverPermission: string; branchScoped: boolean; name: string }[]) {
    for (const s of steps) {
      const ids = await this.approverIds(s.approverPermission, inst.branchId, s.branchScoped);
      await this.notify(ids, `Approval needed: ${s.name}`, inst.title, [inst.requestedById]);
    }
  }

  // ------------------------------------------------------------------- start

  async start(input: {
    code: string;
    entityId: string;
    title: string;
    summary?: string;
    amount?: number | null;
    branchId?: string | null;
    requestedById: string;
    payload?: unknown;
  }) {
    const def = await this.ensureDefinition(input.code);
    if (!def.isActive) throw bad(`The "${def.name}" approval workflow is switched off.`);

    const open = await prisma.workflowInstance.findFirst({
      where: { entityType: def.entityType, entityId: input.entityId, status: "PENDING" },
      select: { instanceNumber: true },
    });
    if (open) throw bad(`This is already awaiting approval (${open.instanceNumber}).`);

    const stages = await prisma.workflowStage.findMany({
      where: { definitionId: def.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    const amount = input.amount ?? 0;
    const applicable = stages.filter((s) => s.minAmount == null || amount >= s.minAmount);
    if (!applicable.length)
      throw bad("No approval stage applies to this amount. Check the workflow design before continuing.");

    const orders = [...new Set(applicable.map((s) => s.order))].sort((a, b) => a - b);
    const first = orders[0];
    const now = new Date();
    const count = await prisma.workflowInstance.count();
    const instanceNumber = `WF-${now.getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;

    const { instance, activated } = await prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          instanceNumber,
          definitionId: def.id,
          definitionCode: def.code,
          entityType: def.entityType,
          entityId: input.entityId,
          title: input.title,
          summary: input.summary?.trim() || null,
          amount: input.amount ?? null,
          branchId: input.branchId ?? null,
          requestedById: input.requestedById,
          currentOrder: first,
          payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      const activated: { approverPermission: string; branchScoped: boolean; name: string }[] = [];
      for (const s of applicable) {
        const live = s.order === first;
        await tx.workflowStep.create({
          data: {
            instanceId: instance.id,
            stageId: s.id,
            order: s.order,
            name: s.name,
            approverPermission: s.approverPermission,
            branchScoped: s.branchScoped,
            escalateAfterHours: s.escalateAfterHours,
            escalateToPermission: s.escalateToPermission,
            status: live ? "PENDING" : "WAITING",
            dueAt: live && s.escalateAfterHours ? new Date(now.getTime() + s.escalateAfterHours * 3_600_000) : null,
          },
        });
        if (live) activated.push({ approverPermission: s.approverPermission, branchScoped: s.branchScoped, name: s.name });
      }
      await this.addEvent(tx, {
        instanceId: instance.id,
        action: "SUBMITTED",
        actorId: input.requestedById,
        comment: input.summary,
      });
      return { instance, activated };
    });

    await this.notifyStepsActivated(instance as unknown as InstRow, activated);
    return instance;
  }

  // ------------------------------------------------------------------ decide

  async decide(
    stepId: string,
    ctx: WfContext,
    d: { decision: string; comment?: string },
    meta: WfMeta = {},
  ) {
    const decision = (d.decision || "").toUpperCase();
    if (decision !== "APPROVE" && decision !== "REJECT") throw bad("Decision must be APPROVE or REJECT.");
    if (decision === "REJECT" && !d.comment?.trim()) throw bad("A reason is required to reject.");

    const step = (await prisma.workflowStep.findUnique({ where: { id: stepId } })) as StepRow | null;
    if (!step) throw notFound("Approval step not found");
    const inst = (await prisma.workflowInstance.findUnique({ where: { id: step.instanceId } })) as InstRow | null;
    if (!inst) throw notFound("Request not found");
    if (inst.status !== "PENDING") throw bad(`This request is already ${inst.status.toLowerCase()}.`);
    if (step.status !== "PENDING") throw bad("This stage is not waiting for a decision.");

    const allSteps = (await prisma.workflowStep.findMany({ where: { instanceId: inst.id } })) as StepRow[];
    const actors = await this.loadActors(ctx);
    const can = this.canAct(step, inst, actors, this.priorApprovers(allSteps));
    if (!can.ok) throw forbid(can.reason);

    const approve = decision === "APPROVE";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const upd = await tx.workflowStep.updateMany({
        where: { id: step.id, status: "PENDING" },
        data: {
          status: approve ? "APPROVED" : "REJECTED",
          actedById: ctx.userId,
          onBehalfOfId: can.onBehalfOfId ?? null,
          actedAt: now,
          comment: d.comment?.trim() || null,
        },
      });
      if (upd.count !== 1) throw bad("Someone else has just decided this stage.");

      await this.addEvent(tx, {
        instanceId: inst.id,
        stepId: step.id,
        action: approve ? "APPROVED" : "REJECTED",
        actorId: ctx.userId,
        onBehalfOfId: can.onBehalfOfId,
        comment: d.comment,
        meta,
      });

      if (!approve) {
        await tx.workflowStep.updateMany({
          where: { instanceId: inst.id, status: { in: ["PENDING", "WAITING"] } },
          data: { status: "SKIPPED" },
        });
        await tx.workflowInstance.update({ where: { id: inst.id }, data: { status: "REJECTED", completedAt: now } });
        return { kind: "REJECTED" as const, activated: [] as { approverPermission: string; branchScoped: boolean; name: string }[] };
      }

      const stillOpen = await tx.workflowStep.count({
        where: { instanceId: inst.id, order: step.order, status: "PENDING" },
      });
      if (stillOpen > 0) return { kind: "WAITING_PARALLEL" as const, activated: [] };

      const next = await tx.workflowStep.findFirst({
        where: { instanceId: inst.id, status: "WAITING" },
        orderBy: { order: "asc" },
        select: { order: true },
      });
      if (!next) {
        await tx.workflowInstance.update({ where: { id: inst.id }, data: { status: "APPROVED", completedAt: now } });
        await this.addEvent(tx, { instanceId: inst.id, action: "COMPLETED", actorId: ctx.userId, meta });
        return { kind: "APPROVED" as const, activated: [] };
      }

      const waiting = await tx.workflowStep.findMany({ where: { instanceId: inst.id, order: next.order, status: "WAITING" } });
      for (const w of waiting) {
        await tx.workflowStep.update({
          where: { id: w.id },
          data: {
            status: "PENDING",
            dueAt: w.escalateAfterHours ? new Date(now.getTime() + w.escalateAfterHours * 3_600_000) : null,
          },
        });
      }
      await tx.workflowInstance.update({ where: { id: inst.id }, data: { currentOrder: next.order } });
      return {
        kind: "ADVANCED" as const,
        activated: waiting.map((w) => ({ approverPermission: w.approverPermission, branchScoped: w.branchScoped, name: w.name })),
      };
    });

    if (result.kind === "ADVANCED") await this.notifyStepsActivated(inst, result.activated);
    if (result.kind === "APPROVED") {
      await this.applyOutcome(inst.id, "APPROVED", ctx.userId);
      await this.notify([inst.requestedById], `Approved: ${inst.title}`, "Your request has been fully approved.");
    }
    if (result.kind === "REJECTED") {
      await this.applyOutcome(inst.id, "REJECTED", ctx.userId, d.comment);
      await this.notify([inst.requestedById], `Rejected: ${inst.title}`, d.comment?.trim() || "Your request was rejected.");
    }
    return this.get(inst.id, ctx);
  }

  /** Runs the domain handler; a failure leaves the request flagged so an admin can retry it. */
  private async applyOutcome(instanceId: string, kind: "APPROVED" | "REJECTED" | "CANCELLED", actorId: string, reason?: string) {
    const inst = (await prisma.workflowInstance.findUnique({ where: { id: instanceId } })) as InstRow | null;
    if (!inst) return;
    const handler = getWorkflowHandler(inst.entityType);
    try {
      if (kind === "APPROVED") {
        if (!handler) throw new Error(`No handler registered for ${inst.entityType}`);
        await handler.onApproved(view(inst), actorId);
      } else if (kind === "REJECTED") {
        await handler?.onRejected?.(view(inst), actorId, reason ?? "");
      } else {
        await handler?.onCancelled?.(view(inst), actorId);
      }
      await prisma.workflowInstance.update({ where: { id: instanceId }, data: { outcomeApplied: true, outcomeError: null } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err, instanceId, kind }, "Workflow outcome failed");
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { outcomeApplied: false, outcomeError: message.slice(0, 500) },
      });
      const admins = await this.approverIds("workflow.design.manage", null, false);
      await this.notify(admins, `Approval outcome failed: ${inst.title}`, message.slice(0, 200));
    }
  }

  async retryOutcome(instanceId: string) {
    const inst = (await prisma.workflowInstance.findUnique({ where: { id: instanceId } })) as InstRow | null;
    if (!inst) throw notFound("Request not found");
    if (inst.status === "PENDING") throw bad("This request is still waiting for approval.");
    const kind = inst.status as "APPROVED" | "REJECTED" | "CANCELLED";
    const last = await prisma.workflowStep.findFirst({
      where: { instanceId, status: kind === "APPROVED" ? "APPROVED" : "REJECTED" },
      orderBy: { actedAt: "desc" },
      select: { actedById: true, comment: true },
    });
    await this.applyOutcome(instanceId, kind, last?.actedById ?? inst.requestedById, last?.comment ?? undefined);
    return prisma.workflowInstance.findUnique({ where: { id: instanceId } });
  }

  // ----------------------------------------------------------- comment / cancel

  private async assertCanView(inst: InstRow, steps: StepRow[], ctx: WfContext) {
    if (inst.requestedById === ctx.userId || ctx.perms.includes("workflow.view_all")) return;
    const actors = await this.loadActors(ctx);
    const touched = steps.some(
      (s) =>
        s.actedById === ctx.userId ||
        actors.some((a) => a.perms.includes(s.approverPermission) || (!!s.escalateToPermission && a.perms.includes(s.escalateToPermission))),
    );
    if (!touched) throw forbid("You are not part of this approval.");
  }

  async comment(instanceId: string, ctx: WfContext, text: string, meta: WfMeta = {}) {
    if (!text?.trim()) throw bad("Write a comment first.");
    const inst = (await prisma.workflowInstance.findUnique({ where: { id: instanceId } })) as InstRow | null;
    if (!inst) throw notFound("Request not found");
    const steps = (await prisma.workflowStep.findMany({ where: { instanceId } })) as StepRow[];
    await this.assertCanView(inst, steps, ctx);
    await prisma.$transaction((tx) =>
      this.addEvent(tx, { instanceId, action: "COMMENTED", actorId: ctx.userId, comment: text, meta }),
    );
    return this.get(instanceId, ctx);
  }

  async cancel(instanceId: string, ctx: WfContext, reason: string, meta: WfMeta = {}) {
    const inst = (await prisma.workflowInstance.findUnique({ where: { id: instanceId } })) as InstRow | null;
    if (!inst) throw notFound("Request not found");
    if (inst.status !== "PENDING") throw bad(`This request is already ${inst.status.toLowerCase()}.`);
    if (inst.requestedById !== ctx.userId && !ctx.perms.includes("workflow.design.manage"))
      throw forbid("Only the person who raised this request can withdraw it.");
    await prisma.$transaction(async (tx) => {
      await tx.workflowStep.updateMany({
        where: { instanceId, status: { in: ["PENDING", "WAITING"] } },
        data: { status: "SKIPPED" },
      });
      await tx.workflowInstance.update({ where: { id: instanceId }, data: { status: "CANCELLED", completedAt: new Date() } });
      await this.addEvent(tx, { instanceId, action: "CANCELLED", actorId: ctx.userId, comment: reason, meta });
    });
    await this.applyOutcome(instanceId, "CANCELLED", ctx.userId, reason);
    return this.get(instanceId, ctx);
  }

  // --------------------------------------------------------------- escalation

  /** Flags overdue stages and widens who may act on them. Safe to call often. */
  async escalateOverdue() {
    const now = new Date();
    const due = await prisma.workflowStep.findMany({
      where: { status: "PENDING", escalatedAt: null, dueAt: { lt: now } },
      take: 100,
    });
    for (const s of due) {
      const inst = (await prisma.workflowInstance.findUnique({ where: { id: s.instanceId } })) as InstRow | null;
      if (!inst || inst.status !== "PENDING") continue;
      const flagged = await prisma.workflowStep.updateMany({
        where: { id: s.id, escalatedAt: null },
        data: { escalatedAt: now },
      });
      if (flagged.count !== 1) continue;
      await prisma.$transaction((tx) =>
        this.addEvent(tx, {
          instanceId: inst.id,
          stepId: s.id,
          action: "ESCALATED",
          actorId: "system",
          comment: `No decision on "${s.name}" within ${s.escalateAfterHours}h`,
        }),
      );
      const target = s.escalateToPermission || "workflow.view_all";
      const ids = await this.approverIds(target, inst.branchId, false);
      await this.notify(ids, `Overdue approval: ${s.name}`, inst.title, [inst.requestedById]);
    }
    return { escalated: due.length };
  }

  // ------------------------------------------------------------------ queries

  /** Stages waiting on the caller (or on someone who delegated to them). */
  async inbox(ctx: WfContext) {
    try {
      await this.escalateOverdue();
    } catch (err) {
      logger.error({ err }, "Escalation sweep failed");
    }
    const actors = await this.loadActors(ctx);
    const perms = [...new Set(actors.flatMap((a) => a.perms))];
    const steps = (await prisma.workflowStep.findMany({
      where: {
        status: "PENDING",
        OR: [{ approverPermission: { in: perms } }, { escalatedAt: { not: null }, escalateToPermission: { in: perms } }],
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    })) as StepRow[];
    if (!steps.length) return [];

    const instanceIds = [...new Set(steps.map((s) => s.instanceId))];
    const [insts, siblings] = await Promise.all([
      prisma.workflowInstance.findMany({ where: { id: { in: instanceIds }, status: "PENDING" } }),
      prisma.workflowStep.findMany({ where: { instanceId: { in: instanceIds } } }),
    ]);
    const instById = new Map((insts as InstRow[]).map((i) => [i.id, i]));
    const out: Record<string, any>[] = [];
    for (const step of steps) {
      const inst = instById.get(step.instanceId);
      if (!inst) continue;
      const prior = this.priorApprovers((siblings as StepRow[]).filter((x) => x.instanceId === inst.id));
      const can = this.canAct(step, inst, actors, prior);
      if (!can.ok) continue;
      out.push({ step, instance: inst, onBehalfOfId: can.onBehalfOfId ?? null });
    }
    const withReq = await this.attachUsers(out.map((o) => ({ ...o.instance, _s: o })), ["requestedById"]);
    return withReq.map((r) => {
      const { _s, ...instance } = r as Record<string, any>;
      return { step: _s.step, instance, onBehalfOfId: _s.onBehalfOfId };
    });
  }

  async listMine(ctx: WfContext) {
    const rows = await prisma.workflowInstance.findMany({
      where: { requestedById: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return this.withSteps(rows as unknown as InstRow[]);
  }

  async listAll(q: { status?: string; entityType?: string; search?: string; limit?: number; offset?: number }) {
    const where: Record<string, any> = {};
    if (q.status) where.status = q.status.toUpperCase();
    if (q.entityType) where.entityType = q.entityType;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { instanceNumber: { contains: s, mode: "insensitive" } },
      ];
    }
    const limit = Math.min(q.limit || 50, 200);
    const [rows, total] = await Promise.all([
      prisma.workflowInstance.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: q.offset || 0 }),
      prisma.workflowInstance.count({ where }),
    ]);
    return { data: await this.withSteps(rows as unknown as InstRow[]), total, limit, offset: q.offset || 0 };
  }

  private async withSteps(rows: InstRow[]) {
    if (!rows.length) return [];
    const steps = await prisma.workflowStep.findMany({
      where: { instanceId: { in: rows.map((r) => r.id) } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    const withUsers = await this.attachUsers(rows as any[], ["requestedById"]);
    return withUsers.map((r: any) => ({ ...r, steps: steps.filter((s) => s.instanceId === r.id) }));
  }

  async get(id: string, ctx: WfContext) {
    const inst = (await prisma.workflowInstance.findUnique({ where: { id } })) as InstRow | null;
    if (!inst) throw notFound("Request not found");
    const steps = (await prisma.workflowStep.findMany({
      where: { instanceId: id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })) as StepRow[];
    await this.assertCanView(inst, steps, ctx);

    const events = await prisma.workflowEvent.findMany({ where: { instanceId: id }, orderBy: { createdAt: "asc" } });
    const actors = await this.loadActors(ctx);
    const prior = this.priorApprovers(steps);
    const mySteps = inst.status === "PENDING"
      ? steps.filter((s) => s.status === "PENDING" && this.canAct(s, inst, actors, prior).ok).map((s) => s.id)
      : [];

    const [withReq] = await this.attachUsers([inst as any], ["requestedById"]);
    return {
      ...withReq,
      steps: await this.attachUsers(steps as any[], ["actedById", "onBehalfOfId"]),
      events: await this.attachUsers(events as any[], ["actorId", "onBehalfOfId"]),
      actionableStepIds: mySteps,
      chainIntact: this.verifyChain(events),
    };
  }

  /** Recomputes the hash chain; false means a row was altered outside the application. */
  private verifyChain(
    events: { instanceId: string; stepId: string | null; action: string; actorId: string; onBehalfOfId: string | null; comment: string | null; createdAt: Date; prevHash: string | null; hash: string }[],
  ) {
    let prev: string | null = null;
    for (const e of events) {
      if ((e.prevHash ?? null) !== prev) return false;
      const expected = sha(
        [prev ?? "", e.instanceId, e.stepId ?? "", e.action, e.actorId, e.onBehalfOfId ?? "", e.comment ?? "", e.createdAt.toISOString()].join("|"),
      );
      if (expected !== e.hash) return false;
      prev = e.hash;
    }
    return true;
  }

  /** Approval history of one business record (shown on the record's own page). */
  async forEntity(entityType: string, entityId: string) {
    const rows = await prisma.workflowInstance.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return this.withSteps(rows as unknown as InstRow[]);
  }

  /** Throws when a record has an unfinished or rejected approval, so it can't be pushed through directly. */
  async assertNotGoverned(entityType: string, entityId: string) {
    const latest = await prisma.workflowInstance.findFirst({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      select: { status: true, instanceNumber: true },
    });
    if (latest && latest.status !== "APPROVED")
      throw forbid(`This is controlled by approval ${latest.instanceNumber} (${latest.status.toLowerCase()}). Decide it from the Approvals page.`);
  }

  // --------------------------------------------------------------- delegation

  async createDelegation(ctx: WfContext, d: { toEmail: string; startsAt: string; endsAt: string; reason?: string }) {
    const to = await prisma.user.findFirst({
      where: { email: { equals: (d.toEmail || "").trim(), mode: "insensitive" } },
      select: { id: true, isActive: true },
    });
    if (!to || !to.isActive) throw bad("No active user with that email.");
    if (to.id === ctx.userId) throw bad("You cannot delegate to yourself.");
    const startsAt = new Date(d.startsAt);
    const endsAt = new Date(d.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw bad("Pick valid start and end dates.");
    if (endsAt <= startsAt) throw bad("The delegation must end after it starts.");
    if (endsAt.getTime() - startsAt.getTime() > 90 * 86_400_000) throw bad("A delegation can last at most 90 days.");
    return prisma.workflowDelegation.create({
      data: { fromUserId: ctx.userId, toUserId: to.id, startsAt, endsAt, reason: d.reason?.trim() || null },
    });
  }

  async listDelegations(ctx: WfContext) {
    const rows = await prisma.workflowDelegation.findMany({
      where: { OR: [{ fromUserId: ctx.userId }, { toUserId: ctx.userId }], isActive: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    return this.attachUsers(rows, ["fromUserId", "toUserId"]);
  }

  async revokeDelegation(id: string, ctx: WfContext) {
    const row = await prisma.workflowDelegation.findUnique({ where: { id } });
    if (!row) throw notFound("Delegation not found");
    if (row.fromUserId !== ctx.userId && !ctx.perms.includes("workflow.design.manage"))
      throw forbid("Only the person who delegated can revoke it.");
    await prisma.workflowDelegation.update({ where: { id }, data: { isActive: false } });
    return { revoked: true };
  }
}

export default new WorkflowService();
