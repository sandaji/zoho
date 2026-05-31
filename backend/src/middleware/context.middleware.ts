import { Request, Response, NextFunction } from "express";
import { asyncContext } from "../lib/async-context";

export const contextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const context = {
    userId: req.user?.userId,
    branchId: req.user?.branchId ?? undefined,
    role: req.user?.role,
    ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip,
    userAgent: req.headers["user-agent"],
  };

  asyncContext.run(context, () => {
    next();
  });
};
