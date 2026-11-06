import { Router, Request, Response, NextFunction } from "express";
import svc from "./messaging.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
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
const ctx = (req: Request) => ({ userId: req.user!.userId, branchIds: req.authorizedBranchIds });

router.get("/status", requirePermission("messaging.view"), wrap(async () => ok(svc.status())));
router.get(
  "/outbox",
  requirePermission("messaging.view"),
  wrap(async (req) =>
    ok(
      await svc.list({
        status: req.query.status as string | undefined,
        channel: req.query.channel as string | undefined,
        search: req.query.search as string | undefined,
      }),
    ),
  ),
);
router.post("/outbox/:id/retry", requirePermission("messaging.manage"), wrap(async (req) => ok(await svc.retry(id(req)))));
router.post("/outbox/:id/cancel", requirePermission("messaging.manage"), wrap(async (req) => ok(await svc.cancel(id(req)))));

router.post(
  "/send",
  requirePermission("messaging.send"),
  wrap(async (req) => ({
    status: 201,
    body: await svc.enqueue({
      channel: req.body?.channel,
      to: req.body?.to,
      subject: req.body?.subject,
      body: req.body?.body,
      templateCode: req.body?.templateCode,
      vars: req.body?.vars,
      category: req.body?.category === "MARKETING" ? "MARKETING" : "TRANSACTIONAL",
      createdById: req.user!.userId,
    }),
  })),
);

// Receipt / invoice copy to the customer of a sale
router.post(
  "/sales/:id/share",
  requirePermission("messaging.send"),
  wrap(async (req) => ({ status: 201, body: await svc.shareSale(ctx(req), id(req), req.body?.channel, req.body?.to) })),
);

router.get("/templates", requirePermission("messaging.view"), wrap(async () => ok(await svc.listTemplates())));
router.put("/templates/:code", requirePermission("messaging.manage"), wrap(async (req) => ok(await svc.saveTemplate(ctx(req), req.params.code as string, req.body ?? {}))));

router.post("/opt-outs", requirePermission("messaging.manage"), wrap(async (req) => ok(await svc.optOut(req.body?.recipient, req.body?.channel))));

export default router;
