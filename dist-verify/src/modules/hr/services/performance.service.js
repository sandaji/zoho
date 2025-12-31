"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
class PerformanceService {
    /**
     * Goal Management
     */
    async createGoal(userId, data) {
        try {
            const goal = await db_1.prisma.goal.create({
                data: {
                    userId,
                    title: data.title,
                    description: data.description,
                    targetDate: data.targetDate ? new Date(data.targetDate) : null,
                    status: 'NOT_STARTED',
                },
            });
            return goal;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to create goal for user ${userId}`);
            throw error;
        }
    }
    async updateGoalProgress(id, progress) {
        try {
            const goal = await db_1.prisma.goal.update({
                where: { id },
                data: {
                    progress,
                    status: progress === 100 ? 'COMPLETED' : 'IN_PROGRESS'
                },
            });
            return goal;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to update goal progress ${id}`);
            throw error;
        }
    }
    async getGoals(userId) {
        try {
            return await db_1.prisma.goal.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to fetch goals for user ${userId}`);
            throw error;
        }
    }
    /**
     * Performance Evaluations
     */
    async createEvaluation(data) {
        try {
            const evaluation = await db_1.prisma.performanceEvaluation.create({
                data: {
                    userId: data.userId,
                    evaluatorId: data.evaluatorId,
                    period: data.period,
                    ratings: data.ratings,
                    comments: data.comments,
                },
            });
            return evaluation;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to create evaluation");
            throw error;
        }
    }
    async getEvaluations(userId) {
        try {
            return await db_1.prisma.performanceEvaluation.findMany({
                where: { userId },
                include: {
                    evaluator: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { date: 'desc' },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to fetch evaluations for user ${userId}`);
            throw error;
        }
    }
    /**
     * Development Plans
     */
    async createDevelopmentPlan(userId, data) {
        try {
            const plan = await db_1.prisma.developmentPlan.create({
                data: {
                    userId,
                    title: data.title,
                    description: data.description,
                },
            });
            return plan;
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to create development plan for user ${userId}`);
            throw error;
        }
    }
    async getDevelopmentPlans(userId) {
        try {
            return await db_1.prisma.developmentPlan.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            logger_1.logger.error({ err: error }, `Failed to fetch development plans for user ${userId}`);
            throw error;
        }
    }
}
exports.PerformanceService = PerformanceService;
