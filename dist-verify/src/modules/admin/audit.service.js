"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const db_1 = require("../../lib/db");
class AuditService {
    static async getAuditLogs(filters) {
        const { entityType, userId, startDate, endDate, limit = 50, offset = 0 } = filters;
        const where = {};
        if (entityType)
            where.entityType = entityType;
        if (userId)
            where.userId = userId;
        if (startDate)
            where.timestamp = { ...where.timestamp, gte: startDate };
        if (endDate)
            where.timestamp = { ...where.timestamp, lte: endDate };
        const [logs, total] = await Promise.all([
            db_1.prisma.auditLog.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: {
                    timestamp: 'desc',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            db_1.prisma.auditLog.count({ where }),
        ]);
        return { data: logs, total, limit, offset };
    }
}
exports.AuditService = AuditService;
