import { Router } from "express";
import crm from "./crm.controller";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission, hasAnyPermission } from "../../middleware/rbac.middleware";

const router = Router();

router.use(authMiddleware);

// Anyone who works the pipeline can read it; the service narrows what they see
// to their own records and territories unless they hold crm.pipeline.view_all.
const CAN_VIEW = ["crm.pipeline.view", "crm.pipeline.manage", "crm.pipeline.view_all"];
const CAN_WORK = ["crm.pipeline.manage"];

router.get("/dashboard", hasAnyPermission(CAN_VIEW), crm.dashboard);

// Leads
router.get("/leads", hasAnyPermission(CAN_VIEW), crm.listLeads);
router.post("/leads", hasAnyPermission(CAN_WORK), crm.createLead);
router.get("/leads/:id", hasAnyPermission(CAN_VIEW), crm.getLead);
router.patch("/leads/:id", hasAnyPermission(CAN_WORK), crm.updateLead);
router.post("/leads/:id/convert", hasAnyPermission(CAN_WORK), crm.convertLead);

// Opportunities
router.get("/opportunities", hasAnyPermission(CAN_VIEW), crm.listOpportunities);
router.post("/opportunities", hasAnyPermission(CAN_WORK), crm.createOpportunity);
router.get("/opportunities/:id", hasAnyPermission(CAN_VIEW), crm.getOpportunity);
router.patch("/opportunities/:id", hasAnyPermission(CAN_WORK), crm.updateOpportunity);
router.post("/opportunities/:id/stage", hasAnyPermission(CAN_WORK), crm.moveStage);
router.post("/opportunities/:id/document", hasAnyPermission(CAN_WORK), crm.linkDocument);
router.delete("/opportunities/:id/document", hasAnyPermission(CAN_WORK), crm.unlinkDocument);

// Interactions and follow-ups
router.get("/interactions", hasAnyPermission(CAN_VIEW), crm.listInteractions);
router.post("/interactions", hasAnyPermission(CAN_WORK), crm.logInteraction);
router.get("/tasks", hasAnyPermission(CAN_VIEW), crm.listTasks);
router.post("/tasks", hasAnyPermission(CAN_WORK), crm.createTask);
router.patch("/tasks/:id/status", hasAnyPermission(CAN_WORK), crm.setTaskStatus);

// Territories
router.get("/territories", hasAnyPermission(CAN_VIEW), crm.listTerritories);
router.get("/territories/:id", hasAnyPermission(CAN_VIEW), crm.getTerritory);
router.post("/territories", requirePermission("crm.territory.manage"), crm.createTerritory);
router.patch("/territories/:id", requirePermission("crm.territory.manage"), crm.updateTerritory);
router.post("/territories/:id/members", requirePermission("crm.territory.manage"), crm.addMember);
router.delete("/territories/:id/members/:userId", requirePermission("crm.territory.manage"), crm.removeMember);

// Sales targets: everyone sees their own; managers set and see all
router.get("/targets", hasAnyPermission([...CAN_VIEW, "crm.target.view", "crm.target.manage"]), crm.listTargets);
router.post("/targets", requirePermission("crm.target.manage"), crm.setTarget);
router.delete("/targets/:id", requirePermission("crm.target.manage"), crm.deleteTarget);

export default router;
