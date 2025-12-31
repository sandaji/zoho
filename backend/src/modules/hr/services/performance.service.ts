
import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";

export class PerformanceService {
  /**
   * Goal Management
   */
  async createGoal(userId: string, data: any) {
    try {
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          status: 'NOT_STARTED',
        },
      });
      return goal;
    } catch (error) {
      logger.error({ err: error }, `Failed to create goal for user ${userId}`);
      throw error;
    }
  }

  async updateGoalProgress(id: string, progress: number) {
    try {
      const goal = await prisma.goal.update({
        where: { id },
        data: { 
          progress,
          status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS'
        },
      });
      return goal;
    } catch (error) {
      logger.error({ err: error }, `Failed to update goal progress ${id}`);
      throw error;
    }
  }

  async getGoals(userId: string) {
    try {
      return await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error({ err: error }, `Failed to fetch goals for user ${userId}`);
      throw error;
    }
  }

  /**
   * Performance Evaluations
   */
  async createEvaluation(data: any) {
    try {
      const evaluation = await prisma.performanceEvaluation.create({
        data: {
          userId: data.userId,
          evaluatorId: data.evaluatorId,
          period: data.period,
          ratings: data.ratings,
          comments: data.comments,
        },
      });
      return evaluation;
    } catch (error) {
      logger.error({ err: error }, "Failed to create evaluation");
      throw error;
    }
  }

  async getEvaluations(userId: string) {
    try {
      return await prisma.performanceEvaluation.findMany({
        where: { userId },
        include: {
          evaluator: {
            select: { id: true, name: true }
          }
        },
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      logger.error({ err: error }, `Failed to fetch evaluations for user ${userId}`);
      throw error;
    }
  }

  /**
   * Development Plans
   */
  async createDevelopmentPlan(userId: string, data: any) {
    try {
      const plan = await prisma.developmentPlan.create({
        data: {
          userId,
          title: data.title,
          description: data.description,
        },
      });
      return plan;
    } catch (error) {
      logger.error({ err: error }, `Failed to create development plan for user ${userId}`);
      throw error;
    }
  }

  async getDevelopmentPlans(userId: string) {
    try {
      return await prisma.developmentPlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error({ err: error }, `Failed to fetch development plans for user ${userId}`);
      throw error;
    }
  }
}
