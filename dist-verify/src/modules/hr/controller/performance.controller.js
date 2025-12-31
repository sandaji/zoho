"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceController = void 0;
const performance_service_1 = require("../services/performance.service");
const performanceService = new performance_service_1.PerformanceService();
class PerformanceController {
    // Goal endpoints
    async createGoal(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const goal = await performanceService.createGoal(userId, req.body);
            res.status(201).json({ success: true, data: goal });
        }
        catch (error) {
            next(error);
        }
    }
    async getGoals(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const goals = await performanceService.getGoals(userId);
            res.json({ success: true, data: goals });
        }
        catch (error) {
            next(error);
        }
    }
    async updateGoalProgress(req, res, next) {
        try {
            const { id } = req.params;
            const { progress } = req.body;
            if (!id) {
                res.status(400).json({ success: false, error: "Goal ID is required" });
                return;
            }
            const goal = await performanceService.updateGoalProgress(id, progress);
            res.json({ success: true, data: goal });
        }
        catch (error) {
            next(error);
        }
    }
    // Evaluation endpoints
    async createEvaluation(req, res, next) {
        try {
            const evaluatorId = req.user.id;
            const evaluation = await performanceService.createEvaluation({
                ...req.body,
                evaluatorId
            });
            res.status(201).json({ success: true, data: evaluation });
        }
        catch (error) {
            next(error);
        }
    }
    async getEvaluations(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const evaluations = await performanceService.getEvaluations(userId);
            res.json({ success: true, data: evaluations });
        }
        catch (error) {
            next(error);
        }
    }
    // Development plan endpoints
    async createDevelopmentPlan(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const plan = await performanceService.createDevelopmentPlan(userId, req.body);
            res.status(201).json({ success: true, data: plan });
        }
        catch (error) {
            next(error);
        }
    }
    async getDevelopmentPlans(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const plans = await performanceService.getDevelopmentPlans(userId);
            res.json({ success: true, data: plans });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PerformanceController = PerformanceController;
