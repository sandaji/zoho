import { Router, Request, Response, NextFunction } from "express";
import svc from "./promotion.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";

const router = Router();
router.use(authMiddleware);

const uid = (req: Request) => req.user!.userId;
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
const ctxOf = async (req: Request) => ({ userId: uid(req), perms: await PermissionService.getUserPermissions(uid(req)) });

// Till preview: any signed-in cashier. Server re-evaluates at sale time anyway.
router.post(
  "/preview",
  wrap(async (req) => ok(await svc.preview((req.body?.branchId as string) ?? null, req.body?.items ?? []))),
);

router.get("/options", requirePermission("sales.promotion.view"), wrap(async () => ok(await svc.options())));
router.get("/products", requirePermission("sales.promotion.view"), wrap(async (req) => ok(await svc.productSearch(String(req.query.search ?? "")))));
router.get("/", requirePermission("sales.promotion.view"), wrap(async (req) => ok(await svc.list(req.query.status as string | undefined))));
router.get("/:id", requirePermission("sales.promotion.view"), wrap(async (req) => ok(await svc.get(id(req)))));
router.post("/", requirePermission("sales.promotion.manage"), wrap(async (req) => ({ status: 201, body: await svc.create(await ctxOf(req), req.body ?? {}) })));
router.put("/:id", requirePermission("sales.promotion.manage"), wrap(async (req) => ok(await svc.update(await ctxOf(req), id(req), req.body ?? {}))));
router.post("/:id/activate", requirePermission("sales.promotion.activate"), wrap(async (req) => ok(await svc.activate(await ctxOf(req), id(req)))));
router.post("/:id/pause", requirePermission("sales.promotion.manage"), wrap(async (req) => ok(await svc.pause(id(req)))));
router.post("/:id/resume", requirePermission("sales.promotion.manage"), wrap(async (req) => ok(await svc.resume(id(req)))));
router.post("/:id/end", requirePermission("sales.promotion.manage"), wrap(async (req) => ok(await svc.end(id(req)))));

export default router;
