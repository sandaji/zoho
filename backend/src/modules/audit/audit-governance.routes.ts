import { Router, Request, Response, NextFunction } from "express";
import svc, { GovCtx } from "./audit-governance.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission, hasAnyPermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";

const ctx = async (req: Request): Promise<GovCtx> => {
  const userId = (req as any).user?.userId as string;
  return { userId, perms: userId ? await PermissionService.getUserPermissions(userId) : [] };
};

type H = (req: Request, c: GovCtx) => Promise<{ status?: number; body: unknown }>;
const wrap =
  (fn: H) =>
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
const id = (req: Request) => req.params.id as string;
const flag = (v: unknown) => v === "true" || v === "1";

// ------------------------------------------------------------------ findings
export const findingsRouter = Router();
findingsRouter.use(authMiddleware);

findingsRouter.get(
  "/overview",
  hasAnyPermission(["audit.finding.view", "audit.finding.manage", "audit.risk.view", "audit.risk.manage"]),
  wrap(async () => ok(await svc.overview())),
);
findingsRouter.get(
  "/",
  wrap(async (req, c) =>
    ok(
      await svc.listFindings(c, {
        status: req.query.status as string,
        severity: req.query.severity as string,
        search: req.query.search as string,
        mine: flag(req.query.mine),
        overdue: flag(req.query.overdue),
      }),
    ),
  ),
);
findingsRouter.post("/", requirePermission("audit.finding.manage"), wrap(async (req, c) => created(await svc.createFinding(c, req.body ?? {}))));
findingsRouter.get("/:id", wrap(async (req, c) => ok(await svc.getFinding(c, id(req)))));
findingsRouter.patch("/:id", requirePermission("audit.finding.manage"), wrap(async (req, c) => ok(await svc.updateFinding(c, id(req), req.body ?? {}))));
findingsRouter.post("/:id/transition", wrap(async (req, c) => ok(await svc.transition(c, id(req), req.body ?? {}))));
findingsRouter.post("/:id/comment", wrap(async (req, c) => ok(await svc.addComment(c, id(req), req.body?.comment))));

// ------------------------------------------------------------- risk register
export const riskRouter = Router();
riskRouter.use(authMiddleware);

riskRouter.get(
  "/",
  hasAnyPermission(["audit.risk.view", "audit.risk.manage"]),
  wrap(async (req) => ok(await svc.listRisks({ status: req.query.status as string, rating: req.query.rating as string }))),
);
riskRouter.post("/", requirePermission("audit.risk.manage"), wrap(async (req, c) => created(await svc.createRisk(c, req.body ?? {}))));
riskRouter.patch("/:id", requirePermission("audit.risk.manage"), wrap(async (req) => ok(await svc.updateRisk(id(req), req.body ?? {}))));
