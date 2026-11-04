import { Router, Request, Response, NextFunction } from "express";
import svc, { DashScope } from "./dashboards.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authMiddleware);

/** requirePermission leaves authorizedBranchIds undefined for GLOBAL scope. */
const scopeOf = (req: Request): DashScope => ({ branchIds: req.authorizedBranchIds });

const wrap =
  (fn: (req: Request) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ status: "success", data: await fn(req) });
    } catch (e) {
      next(e);
    }
  };

router.get("/executive", requirePermission("dashboard.executive.view"), wrap((req) => svc.executive(scopeOf(req))));
router.get("/inventory", requirePermission("dashboard.inventory.view"), wrap((req) => svc.inventory(scopeOf(req))));
router.get(
  "/sales",
  requirePermission("dashboard.sales.view"),
  wrap((req) => svc.sales(scopeOf(req), req.user?.userId, !!req.onlyOwnedRecords)),
);

export default router;
