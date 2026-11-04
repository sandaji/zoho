/**
 * Audit governance: findings raised by auditors and followed to closure, and the
 * risk register. Findings have owners who respond and remediate; only someone other
 * than the owner (with audit.finding.manage) can close one.
 */
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const forbid = (m: string) => new AppError(ErrorCode.FORBIDDEN, 403, m);
const notFound = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);

export interface GovCtx {
  userId: string;
  perms: string[];
}

export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const FINDING_CATEGORIES = ["CONTROL", "COMPLIANCE", "FRAUD_RISK", "DATA_QUALITY", "SEGREGATION_OF_DUTIES", "OTHER"];
const OPEN_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION", "RESOLVED"];
const RISK_CATEGORIES = ["OPERATIONAL", "FINANCIAL", "COMPLIANCE", "STRATEGIC", "TECHNOLOGY", "FRAUD", "OTHER"];
const RISK_STATUSES = ["OPEN", "MITIGATING", "ACCEPTED", "CLOSED"];

const ratingFor = (score: number) => (score >= 15 ? "CRITICAL" : score >= 10 ? "HIGH" : score >= 5 ? "MEDIUM" : "LOW");
const level = (n: unknown, what: string) => {
  const v = Number(n);
  if (!Number.isInteger(v) || v < 1 || v > 5) throw bad(`${what} must be a whole number from 1 to 5.`);
  return v;
};

async function users(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const rows = unique.length
    ? await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true, email: true } })
    : [];
  return new Map(rows.map((u) => [u.id, u]));
}

async function userByEmail(email?: string | null) {
  if (!email?.trim()) return null;
  const u = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  if (!u) throw bad(`No active user with email ${email}.`);
  return u.id;
}

async function notify(userIds: (string | null | undefined)[], title: string, message: string, exclude: string) {
  const targets = [...new Set(userIds.filter((x): x is string => !!x && x !== exclude))];
  if (!targets.length) return;
  try {
    await prisma.notification.createMany({
      data: targets.map((userId) => ({ userId, title, message, type: "AUDIT_FINDING", link: "/dashboard/audit/findings" })),
    });
  } catch (err) {
    logger.error({ err }, "Audit finding notification failed");
  }
}

const canSeeAll = (ctx: GovCtx) => ctx.perms.includes("audit.finding.view") || ctx.perms.includes("audit.finding.manage");

export class AuditGovernanceService {
  // ------------------------------------------------------------------ findings

  private async event(findingId: string, action: string, actorId: string, comment?: string | null) {
    await prisma.auditFindingEvent.create({ data: { findingId, action, actorId, comment: comment?.trim() || null } });
  }

  private async decorate<T extends { raisedById: string; ownerId: string | null; closedById: string | null }>(rows: T[]) {
    const map = await users(rows.flatMap((r) => [r.raisedById, r.ownerId, r.closedById]));
    return rows.map((r) => ({
      ...r,
      raisedBy: map.get(r.raisedById) ?? null,
      owner: r.ownerId ? (map.get(r.ownerId) ?? null) : null,
      closedBy: r.closedById ? (map.get(r.closedById) ?? null) : null,
    }));
  }

  async createFinding(
    ctx: GovCtx,
    d: {
      title: string;
      description: string;
      severity?: string;
      category?: string;
      ownerEmail?: string;
      dueDate?: string;
      entityType?: string;
      entityId?: string;
      auditLogId?: string;
      riskId?: string;
    },
  ) {
    if (!d.title?.trim()) throw bad("A finding needs a title.");
    if (!d.description?.trim()) throw bad("Describe what was found.");
    const severity = (d.severity || "MEDIUM").toUpperCase();
    if (!SEVERITIES.includes(severity)) throw bad("Severity must be LOW, MEDIUM, HIGH or CRITICAL.");
    const category = (d.category || "CONTROL").toUpperCase();
    if (!FINDING_CATEGORIES.includes(category)) throw bad(`Category must be one of: ${FINDING_CATEGORIES.join(", ")}.`);
    const ownerId = await userByEmail(d.ownerEmail);
    if (ownerId === ctx.userId) throw bad("A finding cannot be owned by the person who raised it.");
    let dueDate: Date | null = null;
    if (d.dueDate) {
      dueDate = new Date(d.dueDate);
      if (Number.isNaN(dueDate.getTime())) throw bad("Invalid due date.");
    }
    if (d.riskId && !(await prisma.riskRegisterEntry.findUnique({ where: { id: d.riskId }, select: { id: true } })))
      throw bad("That risk is not in the register.");

    const count = await prisma.auditFinding.count();
    const findingNumber = `AF-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;
    const finding = await prisma.auditFinding.create({
      data: {
        findingNumber,
        title: d.title.trim(),
        description: d.description.trim(),
        severity,
        category,
        entityType: d.entityType?.trim() || null,
        entityId: d.entityId?.trim() || null,
        auditLogId: d.auditLogId || null,
        riskId: d.riskId || null,
        raisedById: ctx.userId,
        ownerId,
        dueDate,
      },
    });
    await this.event(finding.id, "RAISED", ctx.userId, d.description);
    await notify([ownerId], `Audit finding ${findingNumber}: ${finding.title}`, `Severity ${severity}. Please respond.`, ctx.userId);
    return finding;
  }

  async listFindings(ctx: GovCtx, q: { status?: string; severity?: string; mine?: boolean; overdue?: boolean; search?: string }) {
    const where: Record<string, any> = {};
    if (!canSeeAll(ctx) || q.mine) where.ownerId = ctx.userId;
    if (q.status) where.status = q.status.toUpperCase();
    if (q.severity) where.severity = q.severity.toUpperCase();
    if (q.overdue) {
      where.status = { in: ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION"] };
      where.dueDate = { lt: new Date() };
    }
    if (q.search?.trim()) {
      where.OR = [
        { title: { contains: q.search.trim(), mode: "insensitive" } },
        { findingNumber: { contains: q.search.trim(), mode: "insensitive" } },
      ];
    }
    const rows = await prisma.auditFinding.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 300 });
    return this.decorate(rows);
  }

  async getFinding(ctx: GovCtx, id: string) {
    const f = await prisma.auditFinding.findUnique({ where: { id } });
    if (!f) throw notFound("Finding not found");
    if (!canSeeAll(ctx) && f.ownerId !== ctx.userId) throw forbid("This finding is not assigned to you.");
    const events = await prisma.auditFindingEvent.findMany({ where: { findingId: id }, orderBy: { createdAt: "asc" } });
    const map = await users(events.map((e) => e.actorId));
    const [dec] = await this.decorate([f]);
    return { ...dec, events: events.map((e) => ({ ...e, actor: map.get(e.actorId) ?? null })) };
  }

  async updateFinding(
    ctx: GovCtx,
    id: string,
    d: { title?: string; description?: string; severity?: string; category?: string; ownerEmail?: string; dueDate?: string | null; riskId?: string | null },
  ) {
    const f = await prisma.auditFinding.findUnique({ where: { id } });
    if (!f) throw notFound("Finding not found");
    if (["CLOSED", "ACCEPTED_RISK"].includes(f.status)) throw bad("Reopen the finding before editing it.");
    const data: Record<string, unknown> = {};
    if (d.title?.trim()) data.title = d.title.trim();
    if (d.description?.trim()) data.description = d.description.trim();
    if (d.severity) {
      const s = d.severity.toUpperCase();
      if (!SEVERITIES.includes(s)) throw bad("Invalid severity.");
      data.severity = s;
    }
    if (d.category) {
      const c = d.category.toUpperCase();
      if (!FINDING_CATEGORIES.includes(c)) throw bad("Invalid category.");
      data.category = c;
    }
    if (d.ownerEmail !== undefined) {
      const ownerId = await userByEmail(d.ownerEmail);
      if (ownerId && ownerId === f.raisedById) throw bad("A finding cannot be owned by the person who raised it.");
      data.ownerId = ownerId;
    }
    if (d.dueDate !== undefined) {
      const due = d.dueDate ? new Date(d.dueDate) : null;
      if (due && Number.isNaN(due.getTime())) throw bad("Invalid due date.");
      data.dueDate = due;
    }
    if (d.riskId !== undefined) data.riskId = d.riskId || null;
    const updated = await prisma.auditFinding.update({ where: { id }, data });
    await this.event(id, "UPDATED", ctx.userId, Object.keys(data).join(", "));
    if (data.ownerId && data.ownerId !== f.ownerId)
      await notify([data.ownerId as string], `Audit finding ${f.findingNumber} assigned to you`, f.title, ctx.userId);
    return updated;
  }

  /** Status moves. Owners drive a finding forward; auditors close, reopen or accept the risk. */
  async transition(ctx: GovCtx, id: string, d: { status: string; comment?: string; resolution?: string; response?: string }) {
    const f = await prisma.auditFinding.findUnique({ where: { id } });
    if (!f) throw notFound("Finding not found");
    const to = (d.status || "").toUpperCase();
    const from = f.status;
    const isOwner = f.ownerId === ctx.userId;
    const canManage = ctx.perms.includes("audit.finding.manage");
    const data: Record<string, unknown> = { status: to };
    let action = to;

    const ownerMoves: Record<string, string> = { OPEN: "ACKNOWLEDGED", ACKNOWLEDGED: "IN_REMEDIATION", IN_REMEDIATION: "RESOLVED" };
    if (ownerMoves[from] === to) {
      if (!isOwner) throw forbid("Only the finding's owner can move it forward.");
      if (to === "ACKNOWLEDGED") {
        if (!d.response?.trim()) throw bad("Give management's response to the finding.");
        data.managementResponse = d.response.trim();
      }
      if (to === "RESOLVED") {
        if (!d.resolution?.trim()) throw bad("Describe how the finding was resolved.");
        data.resolution = d.resolution.trim();
        data.resolvedAt = new Date();
      }
    } else if (from === "RESOLVED" && to === "CLOSED") {
      if (!canManage) throw forbid("Only an auditor can close a finding.");
      if (isOwner) throw forbid("You cannot close a finding you own.");
      data.closedById = ctx.userId;
      data.closedAt = new Date();
    } else if (from === "RESOLVED" && to === "IN_REMEDIATION") {
      if (!canManage) throw forbid("Only an auditor can send a resolution back.");
      if (!d.comment?.trim()) throw bad("Say why the resolution was not accepted.");
      data.resolvedAt = null;
      action = "RETURNED";
    } else if (to === "ACCEPTED_RISK") {
      if (!canManage) throw forbid("Only an auditor can record an accepted risk.");
      if (!OPEN_STATUSES.includes(from)) throw bad("This finding is already closed.");
      if (!d.comment?.trim()) throw bad("Record who accepted the risk and why.");
      data.closedById = ctx.userId;
      data.closedAt = new Date();
    } else if (to === "OPEN" && ["CLOSED", "ACCEPTED_RISK"].includes(from)) {
      if (!canManage) throw forbid("Only an auditor can reopen a finding.");
      if (!d.comment?.trim()) throw bad("Say why it is being reopened.");
      data.closedById = null;
      data.closedAt = null;
      data.resolvedAt = null;
      action = "REOPENED";
    } else {
      throw bad(`A finding cannot move from ${from} to ${to}.`);
    }

    const updated = await prisma.auditFinding.updateMany({ where: { id, status: from }, data });
    if (updated.count !== 1) throw bad("Someone else has just changed this finding.");
    await this.event(id, action, ctx.userId, d.comment || d.response || d.resolution);
    if (to === "RESOLVED") await notify([f.raisedById], `Finding ${f.findingNumber} resolved`, "Please verify and close it.", ctx.userId);
    if (action === "RETURNED") await notify([f.ownerId], `Finding ${f.findingNumber} sent back`, d.comment ?? "", ctx.userId);
    return this.getFinding(ctx, id);
  }

  async addComment(ctx: GovCtx, id: string, comment: string) {
    if (!comment?.trim()) throw bad("Write a comment first.");
    await this.getFinding(ctx, id);
    await this.event(id, "COMMENTED", ctx.userId, comment);
    return this.getFinding(ctx, id);
  }

  // ------------------------------------------------------------------ risks

  async listRisks(q: { status?: string; rating?: string } = {}) {
    const where: Record<string, any> = {};
    if (q.status) where.status = q.status.toUpperCase();
    if (q.rating) where.rating = q.rating.toUpperCase();
    const rows = await prisma.riskRegisterEntry.findMany({ where, orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: 300 });
    const map = await users(rows.map((r) => r.ownerId));
    const links = await prisma.auditFinding.groupBy({
      by: ["riskId"],
      where: { riskId: { in: rows.map((r) => r.id) }, status: { in: OPEN_STATUSES } },
      _count: true,
    });
    const open = new Map(links.map((l) => [l.riskId as string, l._count as number]));
    return rows.map((r) => ({ ...r, owner: r.ownerId ? (map.get(r.ownerId) ?? null) : null, openFindings: open.get(r.id) ?? 0 }));
  }

  async createRisk(
    ctx: GovCtx,
    d: { title: string; description?: string; category?: string; likelihood: number; impact: number; ownerEmail?: string; mitigation?: string; reviewDate?: string },
  ) {
    if (!d.title?.trim()) throw bad("A risk needs a title.");
    const category = (d.category || "OPERATIONAL").toUpperCase();
    if (!RISK_CATEGORIES.includes(category)) throw bad(`Category must be one of: ${RISK_CATEGORIES.join(", ")}.`);
    const likelihood = level(d.likelihood, "Likelihood");
    const impact = level(d.impact, "Impact");
    const score = likelihood * impact;
    const count = await prisma.riskRegisterEntry.count();
    return prisma.riskRegisterEntry.create({
      data: {
        riskNumber: `RK-${(count + 1).toString().padStart(4, "0")}`,
        title: d.title.trim(),
        description: d.description?.trim() || null,
        category,
        likelihood,
        impact,
        score,
        rating: ratingFor(score),
        ownerId: await userByEmail(d.ownerEmail),
        mitigation: d.mitigation?.trim() || null,
        reviewDate: d.reviewDate ? new Date(d.reviewDate) : null,
        createdById: ctx.userId,
      },
    });
  }

  async updateRisk(
    id: string,
    d: { title?: string; description?: string; category?: string; likelihood?: number; impact?: number; status?: string; ownerEmail?: string; mitigation?: string; reviewDate?: string | null },
  ) {
    const r = await prisma.riskRegisterEntry.findUnique({ where: { id } });
    if (!r) throw notFound("Risk not found");
    const data: Record<string, unknown> = {};
    if (d.title?.trim()) data.title = d.title.trim();
    if (d.description !== undefined) data.description = d.description?.trim() || null;
    if (d.mitigation !== undefined) data.mitigation = d.mitigation?.trim() || null;
    if (d.category) {
      const c = d.category.toUpperCase();
      if (!RISK_CATEGORIES.includes(c)) throw bad("Invalid category.");
      data.category = c;
    }
    if (d.status) {
      const s = d.status.toUpperCase();
      if (!RISK_STATUSES.includes(s)) throw bad(`Status must be one of: ${RISK_STATUSES.join(", ")}.`);
      data.status = s;
    }
    if (d.ownerEmail !== undefined) data.ownerId = await userByEmail(d.ownerEmail);
    if (d.reviewDate !== undefined) data.reviewDate = d.reviewDate ? new Date(d.reviewDate) : null;
    if (d.likelihood !== undefined || d.impact !== undefined) {
      const likelihood = d.likelihood !== undefined ? level(d.likelihood, "Likelihood") : r.likelihood;
      const impact = d.impact !== undefined ? level(d.impact, "Impact") : r.impact;
      data.likelihood = likelihood;
      data.impact = impact;
      data.score = likelihood * impact;
      data.rating = ratingFor(likelihood * impact);
    }
    return prisma.riskRegisterEntry.update({ where: { id }, data });
  }

  // ----------------------------------------------------------------- overview

  async overview() {
    const now = new Date();
    const [findings, risks, overdue] = await Promise.all([
      prisma.auditFinding.findMany({ select: { status: true, severity: true } }),
      prisma.riskRegisterEntry.findMany({ where: { status: { not: "CLOSED" } }, select: { likelihood: true, impact: true, rating: true } }),
      prisma.auditFinding.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION"] }, dueDate: { lt: now } } }),
    ]);
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const f of findings) {
      byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
      if (OPEN_STATUSES.includes(f.status)) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }
    const matrix: Record<string, number> = {};
    const byRating: Record<string, number> = {};
    for (const r of risks) {
      matrix[`${r.likelihood}-${r.impact}`] = (matrix[`${r.likelihood}-${r.impact}`] ?? 0) + 1;
      byRating[r.rating] = (byRating[r.rating] ?? 0) + 1;
    }
    return { findings: { total: findings.length, byStatus, openBySeverity: bySeverity, overdue }, risks: { open: risks.length, byRating, matrix } };
  }
}

export default new AuditGovernanceService();
