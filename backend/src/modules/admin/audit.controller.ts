import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/db';

export class AuditController {
  
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entityType, userId, startDate, endDate, limit = '50', offset = '0' } = req.query;

      const where: any = {};
      
      if (entityType) where.entityType = entityType as string;
      if (userId) where.userId = userId as string;
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate as string);
        if (endDate) where.timestamp.lte = new Date(endDate as string);
      }

      const logs = await prisma.auditLog.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      const total = await prisma.auditLog.count({ where });

      res.status(200).json({
        status: 'success',
        data: logs,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
