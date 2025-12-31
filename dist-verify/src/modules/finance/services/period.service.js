"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodService = void 0;
// backend/src/modules/finance/services/period.service.ts
const db_1 = require("../../../lib/db");
const errors_1 = require("../../../lib/errors");
const enums_1 = require("../../../generated/enums");
class PeriodService {
    /**
     * Get the active fiscal period for a given date
     */
    static async getActivePeriod(date = new Date()) {
        const period = await db_1.prisma.fiscalPeriod.findFirst({
            where: {
                startDate: { lte: date },
                endDate: { gte: date },
                status: 'open'
            }
        });
        if (!period) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "No open fiscal period found for the specified date");
        }
        return period;
    }
    /**
     * Validate if a period is open for posting
     */
    static async ensurePeriodOpen(periodId) {
        const period = await db_1.prisma.fiscalPeriod.findUnique({
            where: { id: periodId }
        });
        if (!period || period.status !== enums_1.FiscalStatus.open) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Fiscal period is closed or locked for posting");
        }
        return period;
    }
    /**
     * Initialize a standard fiscal year with 12 periods
     */
    static async initializeFiscalYear(year) {
        const startDate = new Date(year, 0, 1); // Jan 1st
        const endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31st
        return await db_1.prisma.$transaction(async (tx) => {
            const fiscalYear = await tx.fiscalYear.create({
                data: {
                    name: year.toString(),
                    startDate,
                    endDate,
                    status: enums_1.FiscalStatus.open
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
                    status: enums_1.FiscalStatus.open
                });
            }
            await tx.fiscalPeriod.createMany({ data: periods });
            return fiscalYear;
        });
    }
    /**
     * Lock a fiscal period to prevent further transactions.
     */
    static async lock(periodId, userId) {
        await this.ensurePeriodOpen(periodId);
        return db_1.prisma.$transaction(async (tx) => {
            const updatedPeriod = await tx.fiscalPeriod.update({
                where: { id: periodId },
                data: {
                    isLocked: true,
                    lockedAt: new Date(),
                    lockedById: userId,
                    status: enums_1.FiscalStatus.locked
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
    static async unlock(periodId, userId) {
        const period = await db_1.prisma.fiscalPeriod.findUnique({
            where: { id: periodId },
        });
        if (!period) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Fiscal period not found");
        }
        return db_1.prisma.$transaction(async (tx) => {
            const updatedPeriod = await tx.fiscalPeriod.update({
                where: { id: periodId },
                data: {
                    isLocked: false,
                    lockedAt: null,
                    lockedById: null,
                    status: enums_1.FiscalStatus.open
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
    static async getFiscalPeriods(year) {
        const targetYear = year || new Date().getFullYear();
        return db_1.prisma.fiscalPeriod.findMany({
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
exports.PeriodService = PeriodService;
