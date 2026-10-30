import { Request, Response, NextFunction } from "express";
import { PettyCashService } from "../services/petty-cash.service";
import { PermissionService } from "../../auth/services/permission.service";

const uid = (req: Request): string => (req as any).user?.userId;
const perms = async (req: Request) =>
  uid(req) ? PermissionService.getUserPermissions(uid(req)) : [];

export class PettyCashController {
  private service = new PettyCashService();

  listFunds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ status: "success", data: await this.service.listFunds(uid(req), await perms(req)) });
    } catch (e) {
      next(e);
    }
  };

  getFund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        status: "success",
        data: await this.service.getFund(req.params.id as string, uid(req), await perms(req)),
      });
    } catch (e) {
      next(e);
    }
  };

  createFund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fund = await this.service.createFund(uid(req), {
        ...req.body,
        branchId: req.body.branchId ?? (req as any).user?.branchId,
      });
      res.status(201).json({ status: "success", data: fund });
    } catch (e) {
      next(e);
    }
  };

  topUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        status: "success",
        data: await this.service.topUp(req.params.id as string, uid(req), req.body),
      });
    } catch (e) {
      next(e);
    }
  };

  disburse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        status: "success",
        data: await this.service.disburse(req.params.id as string, uid(req), req.body),
      });
    } catch (e) {
      next(e);
    }
  };

  voidEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        status: "success",
        data: await this.service.voidEntry(req.params.id as string, uid(req), req.body?.reason),
      });
    } catch (e) {
      next(e);
    }
  };
}

export default new PettyCashController();
