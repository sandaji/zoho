import { Router, Request, Response, NextFunction } from "express";
import svc, { supplierPerformance, RfqCtx } from "./rfq.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";

const ctxOf = async (req: Request): Promise<RfqCtx> => ({
  userId: req.user!.userId,
  branchId: req.user!.branchId ?? null,
  perms: await PermissionService.getUserPermissions(req.user!.userId),
  branchIds: req.authorizedBranchIds,
});

type H = (req: Request, c: RfqCtx) => Promise<{ status?: number; body: unknown }>;
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

// ------------------------------------------------------------------------ RFQs
export const rfqRouter = Router();
rfqRouter.use(authMiddleware);

rfqRouter.get("/options", requirePermission("purchasing.rfq.view"), wrap(async (_r, c) => ok(await svc.options(c))));
rfqRouter.get("/products", requirePermission("purchasing.rfq.view"), wrap(async (req) => ok(await svc.productSearch(req.query.search as string))));
rfqRouter.get("/requisitions", requirePermission("purchasing.rfq.view"), wrap(async (_r, c) => ok(await svc.requisitions(c))));
rfqRouter.get("/", requirePermission("purchasing.rfq.view"), wrap(async (req, c) => ok(await svc.list(c, { status: req.query.status as string }))));
rfqRouter.get("/:id", requirePermission("purchasing.rfq.view"), wrap(async (req, c) => ok(await svc.get(c, id(req)))));
rfqRouter.post("/", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ({ status: 201, body: await svc.create(c, req.body ?? {}) })));
rfqRouter.post("/:id/send", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.send(c, id(req)))));
rfqRouter.post("/:id/extend", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.extend(c, id(req), req.body?.closingDate))));
rfqRouter.post("/:id/quotes/:vendorId", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.recordQuote(c, id(req), req.params.vendorId as string, req.body ?? {}))));
rfqRouter.post("/:id/quotes/:vendorId/decline", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.declineQuote(c, id(req), req.params.vendorId as string, req.body?.reason))));
rfqRouter.post("/:id/close", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.close(c, id(req)))));
rfqRouter.post("/:id/cancel", requirePermission("purchasing.rfq.manage"), wrap(async (req, c) => ok(await svc.cancel(c, id(req), req.body?.reason))));
rfqRouter.post("/:id/award", requirePermission("purchasing.rfq.award"), wrap(async (req, c) => ok(await svc.award(c, id(req), req.body ?? {}))));

// ---------------------------------------------------------- supplier performance
export const supplierRouter = Router();
supplierRouter.use(authMiddleware);

supplierRouter.get("/", requirePermission("purchasing.vendor.view"), wrap(async (req) => ok(await supplierPerformance.scorecards(req.query.search as string))));
supplierRouter.get("/:vendorId", requirePermission("purchasing.vendor.view"), wrap(async (req) => ok(await supplierPerformance.scorecard(req.params.vendorId as string))));
supplierRouter.post(
  "/:vendorId/evaluations",
  requirePermission("purchasing.vendor.evaluate"),
  wrap(async (req, c) => ok(await supplierPerformance.evaluate(c.userId, req.params.vendorId as string, req.body ?? {}))),
);
