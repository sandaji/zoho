/** Admin side of integrations: API keys and webhooks. Staff only; the public API lives in public.routes.ts. */
import { Router, Request, Response, NextFunction } from "express";
import keys, { API_SCOPES } from "./api-key.service";
import hooks, { WEBHOOK_EVENTS } from "./webhook.service";
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
const uid = (req: Request) => req.user!.userId;

router.get("/meta", requirePermission("integrations.view"), wrap(async () => ok({ scopes: API_SCOPES, events: WEBHOOK_EVENTS.filter((e) => e !== "ping") })));

router.get("/api-keys", requirePermission("integrations.view"), wrap(async () => ok(await keys.list())));
router.post("/api-keys", requirePermission("integrations.manage"), wrap(async (req) => ({ status: 201, body: await keys.create(uid(req), req.body ?? {}) })));
router.post("/api-keys/:id/revoke", requirePermission("integrations.manage"), wrap(async (req) => ok(await keys.revoke(id(req)))));

router.get("/webhooks", requirePermission("integrations.view"), wrap(async () => ok(await hooks.listEndpoints())));
router.post("/webhooks", requirePermission("integrations.manage"), wrap(async (req) => ({ status: 201, body: await hooks.createEndpoint(uid(req), req.body ?? {}) })));
router.put("/webhooks/:id", requirePermission("integrations.manage"), wrap(async (req) => ok(await hooks.updateEndpoint(id(req), req.body ?? {}))));
router.post("/webhooks/:id/rotate-secret", requirePermission("integrations.manage"), wrap(async (req) => ok(await hooks.rotateSecret(id(req)))));
router.post("/webhooks/:id/test", requirePermission("integrations.manage"), wrap(async (req) => ok(await hooks.test(id(req)))));
router.get("/deliveries", requirePermission("integrations.view"), wrap(async (req) => ok(await hooks.deliveries(req.query.endpointId as string | undefined, req.query.status as string | undefined))));
router.post("/deliveries/:id/retry", requirePermission("integrations.manage"), wrap(async (req) => ok(await hooks.retry(id(req)))));

export default router;
