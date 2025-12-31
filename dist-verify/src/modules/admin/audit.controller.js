"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const db_1 = require("../../lib/db");
class AuditController {
    async getAuditLogs(req, res, next) {
        try {
            const { entityType, userId, startDate, endDate, limit = '50', offset = '0' } = req.query;
            const where = {};
            if (entityType)
                where.entityType = entityType;
            if (userId)
                where.userId = userId;
            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate)
                    where.timestamp.gte = new Date(startDate);
                if (endDate)
                    where.timestamp.lte = new Date(endDate);
            }
            const logs = await db_1.prisma.auditLog.findMany({
                where,
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            const total = await db_1.prisma.auditLog.count({ where });
            res.status(200).json({
                status: 'success',
                data: logs,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditController = AuditController;
