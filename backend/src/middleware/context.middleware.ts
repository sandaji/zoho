import { Request, Response, NextFunction } from 'express';
import { asyncContext } from '../lib/async-context';

export const contextMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const context = {
    userId: (req as any).user?.userId, // Assuming authMiddleware populates req.user
    ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
    userAgent: req.headers['user-agent'],
  };

  asyncContext.run(context, () => {
    next();
  });
};
