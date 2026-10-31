import { Router } from "express";
import wf from "./workflow.controller";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import "./handlers"; // registers what approved / rejected requests do

const router = Router();
router.use(authMiddleware);

// Every signed-in user can see their own requests and anything waiting on them;
// the service decides whether a given step is theirs to act on (permission,
// branch, segregation of duties, delegation).
router.get("/inbox", wf.inbox);
router.get("/mine", wf.mine);
router.get("/delegations", wf.listDelegations);
router.post("/delegations", wf.createDelegation);
router.delete("/delegations/:id", wf.revokeDelegation);

router.get("/definitions", wf.listDefinitions);
router.put("/definitions/:code", requirePermission("workflow.design.manage"), wf.updateDefinition);

router.get("/instances", requirePermission("workflow.view_all"), wf.all);
router.get("/instances/:id", wf.get);
router.get("/entity/:entityType/:entityId", wf.forEntity);
router.post("/instances/:id/comment", wf.comment);
router.post("/instances/:id/cancel", wf.cancel);
router.post("/instances/:id/retry-outcome", requirePermission("workflow.design.manage"), wf.retryOutcome);

router.post("/steps/:stepId/decision", wf.decide);
router.post("/escalate", requirePermission("workflow.design.manage"), wf.escalate);

export default router;
