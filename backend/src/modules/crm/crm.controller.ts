import { Request, Response, NextFunction } from "express";
import crmService, { CrmContext } from "./crm.service";
import { PermissionService } from "../auth/services/permission.service";

const ctx = async (req: Request): Promise<CrmContext> => {
  const user = (req as any).user;
  return {
    userId: user?.userId,
    branchId: user?.branchId ?? null,
    perms: user?.userId ? await PermissionService.getUserPermissions(user.userId) : [],
  };
};

const id = (req: Request) => req.params.id as string;
const flag = (v: unknown) => (v === undefined ? undefined : v === "true" || v === "1");

type Handler = (req: Request, c: CrmContext) => Promise<{ status?: number; body: unknown }>;

/** Wraps a handler: builds the caller context, sends { status, data }, forwards errors. */
const wrap =
  (fn: Handler) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = await fn(req, await ctx(req));
      res.status(out.status ?? 200).json({ status: "success", data: out.body });
    } catch (e) {
      next(e);
    }
  };

const ok = (body: unknown) => ({ body });
const created = (body: unknown) => ({ status: 201, body });

export class CrmController {
  dashboard = wrap(async (_req, c) => ok(await crmService.dashboard(c)));

  // Leads
  listLeads = wrap(async (req, c) => {
    const q = req.query;
    return ok(
      await crmService.listLeads(c, {
        status: q.status as string,
        search: q.search as string,
        territoryId: q.territoryId as string,
        ownerId: q.ownerId as string,
        limit: q.limit ? parseInt(q.limit as string, 10) : undefined,
        offset: q.offset ? parseInt(q.offset as string, 10) : undefined,
      }),
    );
  });
  createLead = wrap(async (req, c) => created(await crmService.createLead(c, req.body)));
  getLead = wrap(async (req, c) => ok(await crmService.getLead(id(req), c)));
  updateLead = wrap(async (req, c) => ok(await crmService.updateLead(id(req), c, req.body)));
  convertLead = wrap(async (req, c) => ok(await crmService.convertLead(id(req), c)));

  // Opportunities
  listOpportunities = wrap(async (req, c) => {
    const q = req.query;
    return ok(
      await crmService.listOpportunities(c, {
        stage: q.stage as string,
        search: q.search as string,
        territoryId: q.territoryId as string,
        ownerId: q.ownerId as string,
        open: flag(q.open),
      }),
    );
  });
  createOpportunity = wrap(async (req, c) => created(await crmService.createOpportunity(c, req.body)));
  getOpportunity = wrap(async (req, c) => ok(await crmService.getOpportunity(id(req), c)));
  updateOpportunity = wrap(async (req, c) => ok(await crmService.updateOpportunity(id(req), c, req.body)));
  moveStage = wrap(async (req, c) =>
    ok(await crmService.moveStage(id(req), c, req.body?.stage, req.body?.lostReason)),
  );

  linkDocument = wrap(async (req, c) => ok(await crmService.linkDocument(id(req), c, req.body?.documentNumber)));
  unlinkDocument = wrap(async (req, c) => ok(await crmService.unlinkDocument(id(req), c)));

  // Interactions
  listInteractions = wrap(async (req, c) =>
    ok(
      await crmService.listInteractions(c, {
        leadId: req.query.leadId as string,
        opportunityId: req.query.opportunityId as string,
        customerId: req.query.customerId as string,
      }),
    ),
  );
  logInteraction = wrap(async (req, c) => created(await crmService.logInteraction(c, req.body)));

  // Follow-up tasks
  listTasks = wrap(async (req, c) =>
    ok(
      await crmService.listTasks(c, {
        status: req.query.status as string,
        mine: flag(req.query.mine),
        leadId: req.query.leadId as string,
        opportunityId: req.query.opportunityId as string,
        overdue: flag(req.query.overdue),
      }),
    ),
  );
  createTask = wrap(async (req, c) => created(await crmService.createTask(c, req.body)));
  setTaskStatus = wrap(async (req, c) => ok(await crmService.setTaskStatus(id(req), c, req.body?.status)));

  // Territories
  listTerritories = wrap(async (_req, c) => ok(await crmService.listTerritories(c)));
  getTerritory = wrap(async (req, c) => ok(await crmService.getTerritory(id(req), c)));
  createTerritory = wrap(async (req, c) => created(await crmService.createTerritory(c, req.body)));
  updateTerritory = wrap(async (req) => ok(await crmService.updateTerritory(id(req), req.body)));
  addMember = wrap(async (req) => created(await crmService.addMember(id(req), req.body?.email)));
  removeMember = wrap(async (req) => ok(await crmService.removeMember(id(req), req.params.userId as string)));

  // Sales targets
  listTargets = wrap(async (req, c) => ok(await crmService.listTargets(c, { current: flag(req.query.current) })));
  setTarget = wrap(async (req, c) => created(await crmService.setTarget(c, req.body)));
  deleteTarget = wrap(async (req) => ok(await crmService.deleteTarget(id(req))));
}

export default new CrmController();
