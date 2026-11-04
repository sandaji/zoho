import { Router, Request, Response, NextFunction } from "express";
import svc, { PeopleCtx } from "./people.service";
import { authMiddleware } from "@core/middleware/auth";
import { requirePermission } from "../../middleware/rbac.middleware";
import { PermissionService } from "../auth/services/permission.service";

const router = Router();
router.use(authMiddleware);

const uid = (req: Request) => req.user!.userId;
const ctxOf = async (req: Request): Promise<PeopleCtx> => ({
  userId: uid(req),
  perms: await PermissionService.getUserPermissions(uid(req)),
  branchIds: req.authorizedBranchIds,
});

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
const created = (body: unknown) => ({ status: 201, body });
const id = (req: Request) => req.params.id as string;

// ---------------------------------------------------------------- self-service
// Every signed-in employee, strictly their own record.
router.get("/self/profile", wrap(async (req) => ok(await svc.myProfile(uid(req)))));
router.patch("/self/profile", wrap(async (req) => ok(await svc.updateMyProfile(uid(req), req.body ?? {}))));
router.get("/self/payslips", wrap(async (req) => ok(await svc.myPayslips(uid(req)))));
router.get("/self/leave-types", wrap(async () => ok(await svc.leaveTypes())));
router.post("/self/leave", wrap(async (req) => created(await svc.requestLeave(uid(req), req.body ?? {}))));
router.post("/self/leave/:id/cancel", wrap(async (req) => ok(await svc.cancelMyLeave(uid(req), id(req)))));

// ------------------------------------------------------------ salary structures
router.get("/salary-structures", requirePermission("hr.contract.view"), wrap(async () => ok(await svc.listStructures())));
router.post("/salary-structures", requirePermission("hr.salary_structure.manage"), wrap(async (req) => created(await svc.saveStructure(null, req.body ?? {}))));
router.put("/salary-structures/:id", requirePermission("hr.salary_structure.manage"), wrap(async (req) => ok(await svc.saveStructure(id(req), req.body ?? {}))));

// ------------------------------------------------------------------- contracts
router.get(
  "/contracts",
  requirePermission("hr.contract.view"),
  wrap(async (req) => {
    await svc.expireOverdue();
    return ok(
      await svc.listContracts(await ctxOf(req), {
        status: req.query.status as string,
        userId: req.query.userId as string,
        search: req.query.search as string,
        expiringInDays: req.query.expiringInDays ? Number(req.query.expiringInDays) : undefined,
      }),
    );
  }),
);
router.post("/contracts", requirePermission("hr.contract.manage"), wrap(async (req) => created(await svc.createContract(await ctxOf(req), req.body ?? {}))));
router.get("/contracts/:id", requirePermission("hr.contract.view"), wrap(async (req) => ok(await svc.getContract(await ctxOf(req), id(req)))));
router.patch("/contracts/:id", requirePermission("hr.contract.manage"), wrap(async (req) => ok(await svc.updateContract(await ctxOf(req), id(req), req.body ?? {}))));
router.delete("/contracts/:id", requirePermission("hr.contract.manage"), wrap(async (req) => ok(await svc.discardDraft(await ctxOf(req), id(req)))));
router.post("/contracts/:id/activate", requirePermission("hr.contract.activate"), wrap(async (req) => ok(await svc.activateContract(await ctxOf(req), id(req)))));
router.post("/contracts/:id/terminate", requirePermission("hr.contract.activate"), wrap(async (req) => ok(await svc.terminateContract(await ctxOf(req), id(req), req.body ?? {}))));

// Draft the month's payroll from active contracts (approval still goes through the workflow)
router.post("/payroll/generate", requirePermission("hr.payroll.manage"), wrap(async (req) => created(await svc.generatePayroll(await ctxOf(req), req.body ?? {}))));

export default router;
