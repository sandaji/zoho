
import { prisma } from '../../lib/db';

export class AuditService {
  static async getAuditLogs(filters: {
    entityType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { entityType, userId, startDate, endDate, limit = 50, offset = 0 } = filters;
    
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (startDate) where.timestamp = { ...where.timestamp, gte: startDate };
    if (endDate) where.timestamp = { ...where.timestamp, lte: endDate };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
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
      prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, limit, offset };
  }
}
