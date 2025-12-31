// backend/src/modules/finance/services/period.service.ts
import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { FiscalStatus } from "../../../generated/enums";

export class PeriodService {
  /**
   * Get the active fiscal period for a given date
   */
  static async getActivePeriod(date: Date = new Date()) {
    const period = await prisma.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
        status: 'open'
      }
    });

    if (!period) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        "No open fiscal period found for the specified date"
      );
    }

    return period;
  }

  /**
   * Validate if a period is open for posting
   */
  static async ensurePeriodOpen(periodId: string) {
    const period = await prisma.fiscalPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period || period.status !== FiscalStatus.open) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        "Fiscal period is closed or locked for posting"
      );
    }

    return period;
  }

  /**
   * Initialize a standard fiscal year with 12 periods
   */
  static async initializeFiscalYear(year: number) {
    const startDate = new Date(year, 0, 1); // Jan 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st

    return await prisma.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscalYear.create({
        data: {
          name: year.toString(),
          startDate,
          endDate,
          status: FiscalStatus.open
        }
      });

      const periods = [];
      for (let month = 0; month < 12; month++) {
        const pStartDate = new Date(year, month, 1);
        const pEndDate = new Date(year, month + 1, 0, 23, 59, 59);
        
        periods.push({
          fiscalYearId: fiscalYear.id,
          name: pStartDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
          startDate: pStartDate,
          endDate: pEndDate,
          status: FiscalStatus.open
        });
      }

      await tx.fiscalPeriod.createMany({ data: periods });
      return fiscalYear;
    });
  }

  /**
   * Lock a fiscal period to prevent further transactions.
   */
  static async lock(periodId: string, userId: string) {
    await this.ensurePeriodOpen(periodId);
    
    return prisma.$transaction(async (tx) => {
      const updatedPeriod = await tx.fiscalPeriod.update({
        where: { id: periodId },
        data: {
          isLocked: true,
          lockedAt: new Date(),
          lockedById: userId,
          status: FiscalStatus.locked
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'FiscalPeriod',
          entityId: periodId,
          action: 'UPDATE',
          userId: userId,
          changes: { action: 'LOCK', reason: 'Admin Action', status: 'LOCKED' },
          timestamp: new Date()
        }
      });

      return updatedPeriod;
    });
  }

  /**
   * Unlock a fiscal period to allow transactions.
   */
  static async unlock(periodId: string, userId?: string) {
    const period = await prisma.fiscalPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new AppError(ErrorCode.NOT_FOUND as any, 404, "Fiscal period not found");
    }
    
    return prisma.$transaction(async (tx) => {
      const updatedPeriod = await tx.fiscalPeriod.update({
        where: { id: periodId },
        data: {
          isLocked: false,
          lockedAt: null,
          lockedById: null,
          status: FiscalStatus.open
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: 'FiscalPeriod',
          entityId: periodId,
          action: 'UPDATE',
          userId: userId || 'system',
          changes: { action: 'UNLOCK', reason: 'Admin Action', status: 'OPEN' },
          timestamp: new Date()
        }
      });

      return updatedPeriod;
    });
  }

  /**
   * Get all fiscal periods for a given year.
   */
  static async getFiscalPeriods(year?: number) {
    const targetYear = year || new Date().getFullYear();
    
    return prisma.fiscalPeriod.findMany({
      where: {
        fiscalYear: {
          name: targetYear.toString()
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      include: {
        lockedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }
}
