import { Request, Response, NextFunction } from 'express';
import { prisma } from '@core/database/db';
import { computeFieldChanges } from './audit-diff';

export class AuditController {
  /**
   * GET /audit-logs
   * Filters: userId, user (name/email contains), entityType (contains), entityId,
   * action, q (request path contains), outcome (OK|REFUSED), startDate, endDate,
   * limit, offset.
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        entityType, entityId, userId, user, action, q, outcome,
        startDate, endDate, limit = '50', offset = '0',
      } = req.query;

      const take = Math.min(parseInt(limit as string) || 50, 200);
      const skip = parseInt(offset as string) || 0;

      const and: any[] = [];
      if (entityType) and.push({ entityType: { contains: entityType as string, mode: 'insensitive' } });
      if (entityId) and.push({ entityId: entityId as string });
      if (userId) and.push({ userId: userId as string });
      if (action) and.push({ action: action as string });
      if (user) {
        and.push({
          user: {
            OR: [
              { name: { contains: user as string, mode: 'insensitive' } },
              { email: { contains: user as string, mode: 'insensitive' } },
            ],
          },
        });
      }
      if (q) and.push({ changes: { path: ['path'], string_contains: q as string } });
      if (outcome) and.push({ changes: { path: ['outcome'], equals: outcome as string } });
      if (startDate || endDate) {
        const timestamp: any = {};
        if (startDate) timestamp.gte = new Date(startDate as string);
        if (endDate) {
          // an end *date* means "through the end of that day"
          const end = new Date(endDate as string);
          if (/^\d{4}-\d{2}-\d{2}$/.test(endDate as string)) end.setHours(23, 59, 59, 999);
          timestamp.lte = end;
        }
        and.push({ timestamp });
      }
      const where = and.length ? { AND: and } : {};

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          take,
          skip,
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.status(200).json({
        status: 'success',
        data: logs.map((l) => ({ ...l, fieldChanges: computeFieldChanges(l.action as string, l.changes) })),
        pagination: { total, limit: take, offset: skip },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /audit-logs/entity/:entityType/:entityId
   * Everything that ever happened to one record, oldest first, with field-level old/new values.
   */
  async getEntityHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entityType = req.params.entityType as string;
      const entityId = req.params.entityId as string;
      const logs = await prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { timestamp: 'asc' },
        take: 500,
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.status(200).json({
        status: 'success',
        data: logs.map((l) => ({ ...l, fieldChanges: computeFieldChanges(l.action as string, l.changes) })),
      });
    } catch (error) {
      next(error);
    }
  }
}
