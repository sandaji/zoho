import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const validateFiscalPeriod = (dateFieldName?: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let transactionDate: Date | undefined;

    if (dateFieldName && req.body[dateFieldName]) {
      transactionDate = new Date(req.body[dateFieldName]);
    } else {
      transactionDate = new Date();
    }

    if (!transactionDate) {
      // Should not happen with the new logic, but as a safeguard.
      return next();
    }

    try {
      const fiscalPeriod = await prisma.fiscalPeriod.findFirst({
        where: {
          startDate: { lte: transactionDate },
          endDate: { gte: transactionDate },
        },
      });

      if (fiscalPeriod && fiscalPeriod.isLocked) {
        return res.status(403).json({ message: 'Cannot post to locked period' });
      }

      next();
    } catch (error) {
      console.error('Error validating fiscal period:', error);
      next(error);
    }
  };
};
