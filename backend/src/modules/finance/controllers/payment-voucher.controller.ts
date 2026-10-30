import { Request, Response, NextFunction } from "express";
import { PaymentVoucherService } from "../services/payment-voucher.service";
import { PaymentVoucherStatus } from "../../../generated";
import { PermissionService } from "../../auth/services/permission.service";

async function getUserPermissions(userId?: string): Promise<string[]> {
  if (!userId) return [];
  return PermissionService.getUserPermissions(userId);
}

const uid = (req: Request): string => (req as any).user?.userId;

export class PaymentVoucherController {
  private service = new PaymentVoucherService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await this.service.create(
        uid(req),
        (req as any).user?.branchId,
        req.body,
      );
      res.status(201).json({ status: "success", data: voucher });
    } catch (e) {
      next(e);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await this.service.update(
        req.params.id as string,
        uid(req),
        req.body,
      );
      res.json({ status: "success", data: voucher });
    } catch (e) {
      next(e);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await this.service.get(
        req.params.id as string,
        uid(req),
        await getUserPermissions(uid(req)),
      );
      res.json({ status: "success", data: voucher });
    } catch (e) {
      next(e);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, skip, take } = req.query;
      const result = await this.service.list({
        status: status as PaymentVoucherStatus | undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
        userId: uid(req),
        userPermissions: await getUserPermissions(uid(req)),
      });
      res.json({ status: "success", data: result });
    } catch (e) {
      next(e);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, rejectionReason } = req.body;
      const voucher = await this.service.updateStatus(
        req.params.id as string,
        status,
        uid(req),
        await getUserPermissions(uid(req)),
        rejectionReason,
      );
      res.json({ status: "success", data: voucher });
    } catch (e) {
      next(e);
    }
  };

  pay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voucher = await this.service.pay(req.params.id as string, uid(req));
      res.json({ status: "success", data: voucher });
    } catch (e) {
      next(e);
    }
  };
}

export default new PaymentVoucherController();
