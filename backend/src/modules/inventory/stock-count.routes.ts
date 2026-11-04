import { Router, Request, Response, NextFunction } from "express";
import svc, { CountCtx } from "./services/stock-count.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";
import "../workflow/handlers"; // registers the STOCK_COUNT outcome handler

const router = Router();
router.use(authMiddleware);

const ctxOf = async (req: Request): Promise<CountCtx> => ({
  userId: req.user!.userId,
  branchId: req.user!.branchId ?? null,
  perms: await PermissionService.getUserPermissions(req.user!.userId),
  branchIds: req.authorizedBranchIds,
});

type H = (req: Request, c: CountCtx) => Promise<{ status?: number; body: unknown }>;
const wrap =
  (fn: H) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req, await ctxOf(req));
      res.status(out.status ?? 200).json({ status: "success", data: out.body });
    } catch (e) {
      next(e);
    }
  };
const ok = (body: unknown) => ({ body });
const id = (req: Request) => req.params.id as string;

router.get("/warehouses", requirePermission("inventory.count.view"), wrap(async (_req, c) => ok(await svc.warehouses(c))));
router.get("/", requirePermission("inventory.count.view"), wrap(async (req, c) => ok(await svc.list(c, { status: req.query.status as string, warehouseId: req.query.warehouseId as string }))));
router.get("/:id", requirePermission("inventory.count.view"), wrap(async (req, c) => ok(await svc.get(c, id(req)))));
router.post("/", requirePermission("inventory.count.manage"), wrap(async (req, c) => ({ status: 201, body: await svc.create(c, req.body ?? {}) })));
router.post("/:id/start", requirePermission("inventory.count.manage"), wrap(async (req, c) => ok(await svc.start(c, id(req)))));
router.put("/:id/lines/:lineId", requirePermission("inventory.count.enter"), wrap(async (req, c) => ok(await svc.enter(c, id(req), req.params.lineId as string, req.body ?? {}))));
router.post("/:id/submit", requirePermission("inventory.count.enter"), wrap(async (req, c) => ok(await svc.submit(c, id(req)))));
router.post("/:id/recount", requirePermission("inventory.count.manage"), wrap(async (req, c) => ok(await svc.recount(c, id(req), req.body ?? {}))));
router.post("/:id/post", requirePermission("inventory.count.manage"), wrap(async (req, c) => ({ status: 202, body: await svc.post(c, id(req)) })));
router.post("/:id/cancel", requirePermission("inventory.count.manage"), wrap(async (req, c) => ok(await svc.cancel(c, id(req), req.body?.reason))));

export default router;
