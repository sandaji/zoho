import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import { forecastService } from "./forecast.service";

const router = Router();
router.use(authMiddleware);

const wrap =
  (fn: (req: Request) => Promise<{ status?: number; body: unknown }>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req);
      res.status(out.status ?? 200).json({ status: "success", data: out.body });
    } catch (e) {
      next(e);
    }
  };

router.get(
  "/",
  requirePermission("purchasing.forecast.view"),
  wrap(async (req) => ({
    body: await forecastService.compute({
      coverDays: req.query.coverDays ? Number(req.query.coverDays) : undefined,
      category: (req.query.category as string) || undefined,
      search: (req.query.search as string) || undefined,
      onlyActionable: req.query.onlyActionable === "true",
    }),
  })),
);

router.post(
  "/requisition",
  requirePermission("purchasing.forecast.requisition"),
  wrap(async (req) => ({
    status: 201,
    body: await forecastService.createRequisition(req.user!.userId, req.body ?? {}),
  })),
);

export default router;
