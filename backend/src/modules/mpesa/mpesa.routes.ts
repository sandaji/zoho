import { Router, Request, Response, NextFunction } from "express";
import svc, { type MpesaCtx } from "./mpesa.service";
import { authMiddleware } from "@core/middleware/auth";
import { hasAnyPermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";

const router = Router();

// ---- PUBLIC: Safaricom calls this. Authenticated by the secret token in the URL, not a login.
router.post("/callback", async (req: Request, res: Response) => {
  try {
    const accepted = await svc.handleCallback(req.query.token as string | undefined, req.body);
    if (!accepted) return res.status(403).json({ ResultCode: 1, ResultDesc: "Rejected" });
  } catch {
    // Never make Safaricom retry because of an internal problem; it is logged by the service.
  }
  return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

router.use(authMiddleware);

type H = (req: Request) => Promise<{ status?: number; body: unknown }>;
const wrap =
  (fn: H) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req);
      res.status(out.status ?? 200).json({ status: "success", data: out.body });
    } catch (e) {
      next(e);
    }
  };
const ok = (body: unknown) => ({ body });
const id = (req: Request) => req.params.id as string;
const ctxOf = async (req: Request): Promise<MpesaCtx> => {
  const perms = await PermissionService.getUserPermissions(req.user!.userId);
  return { userId: req.user!.userId, branchIds: req.authorizedBranchIds, canViewAll: perms.includes("sales.mpesa.view") };
};

const canUse = hasAnyPermission(["sales.mpesa.initiate", "sales.mpesa.view"]);

router.get("/status", canUse, wrap(async () => ok(svc.status())));
router.post("/stk", hasAnyPermission(["sales.mpesa.initiate"]), wrap(async (req) => ({ status: 201, body: await svc.initiate(await ctxOf(req), req.body ?? {}) })));
router.get("/requests", canUse, wrap(async (req) => ok(await svc.list(await ctxOf(req), { status: req.query.status as string | undefined, search: req.query.search as string | undefined }))));
router.get("/requests/:id", canUse, wrap(async (req) => ok(await svc.get(await ctxOf(req), id(req)))));
router.post("/requests/:id/query", canUse, wrap(async (req) => ok(await svc.query(await ctxOf(req), id(req)))));
router.get("/verify/:code", canUse, wrap(async (req) => ok(await svc.verifyReceipt(req.params.code as string))));

export default router;
