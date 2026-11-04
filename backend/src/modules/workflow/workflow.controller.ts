import { Request, Response, NextFunction } from "express";
import workflow, { WfContext, WfMeta } from "./workflow.service";
import { PermissionService } from "../auth/services/permission.service";

const ctx = async (req: Request): Promise<WfContext> => {
  const user = (req as any).user;
  return {
    userId: user?.userId,
    branchId: user?.branchId ?? null,
    perms: user?.userId ? await PermissionService.getUserPermissions(user.userId) : [],
  };
};
const meta = (req: Request): WfMeta => ({ ip: req.ip, userAgent: req.get("user-agent") ?? undefined });
const id = (req: Request) => req.params.id as string;

type Handler = (req: Request, c: WfContext) => Promise<{ status?: number; body: unknown }>;
const wrap =
  (fn: Handler) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req, await ctx(req));
      res.status(out.status ?? 200).json({ status: "success", data: out.body });
    } catch (e) {
      next(e);
    }
  };
const ok = (body: unknown) => ({ body });
const created = (body: unknown) => ({ status: 201, body });

export class WorkflowController {
  inbox = wrap(async (_req, c) => ok(await workflow.inbox(c)));
  mine = wrap(async (_req, c) => ok(await workflow.listMine(c)));
  all = wrap(async (req) =>
    ok(
      await workflow.listAll({
        status: req.query.status as string,
        entityType: req.query.entityType as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      }),
    ),
  );
  get = wrap(async (req, c) => ok(await workflow.get(id(req), c)));
  forEntity = wrap(async (req) =>
    ok(await workflow.forEntity(req.params.entityType as string, req.params.entityId as string)),
  );

  decide = wrap(async (req, c) => ok(await workflow.decide(req.params.stepId as string, c, req.body ?? {}, meta(req))));
  comment = wrap(async (req, c) => ok(await workflow.comment(id(req), c, req.body?.comment, meta(req))));
  cancel = wrap(async (req, c) => ok(await workflow.cancel(id(req), c, req.body?.reason, meta(req))));
  retryOutcome = wrap(async (req) => ok(await workflow.retryOutcome(id(req))));
  escalate = wrap(async () => ok(await workflow.escalateOverdue()));

  requestPriceOverride = wrap(async (req, c) => created(await workflow.requestPriceOverride(c, req.body ?? {})));

  listDefinitions = wrap(async () => ok(await workflow.listDefinitions()));
  updateDefinition = wrap(async (req) => ok(await workflow.updateDefinition(req.params.code as string, req.body ?? {})));

  listDelegations = wrap(async (_req, c) => ok(await workflow.listDelegations(c)));
  createDelegation = wrap(async (req, c) => created(await workflow.createDelegation(c, req.body ?? {})));
  revokeDelegation = wrap(async (req, c) => ok(await workflow.revokeDelegation(id(req), c)));
}

export default new WorkflowController();
