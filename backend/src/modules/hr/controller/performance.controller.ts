
import { Request, Response, NextFunction } from "express";
import { PerformanceService } from "../services/performance.service";

const performanceService = new PerformanceService();

export class PerformanceController {
  // Goal endpoints
  async createGoal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const goal = await performanceService.createGoal(userId, req.body);
      res.status(201).json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }

  async getGoals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const goals = await performanceService.getGoals(userId);
      res.json({ success: true, data: goals });
    } catch (error) {
      next(error);
    }
  }

  async updateGoalProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { progress } = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: "Goal ID is required" });
        return;
      }
      const goal = await performanceService.updateGoalProgress(id, progress);
      res.json({ success: true, data: goal });
    } catch (error) {
      next(error);
    }
  }

  // Evaluation endpoints
  async createEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const evaluatorId = (req as any).user.id;
      const evaluation = await performanceService.createEvaluation({
        ...req.body,
        evaluatorId
      });
      res.status(201).json({ success: true, data: evaluation });
    } catch (error) {
      next(error);
    }
  }

  async getEvaluations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const evaluations = await performanceService.getEvaluations(userId);
      res.json({ success: true, data: evaluations });
    } catch (error) {
      next(error);
    }
  }

  // Development plan endpoints
  async createDevelopmentPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const plan = await performanceService.createDevelopmentPlan(userId, req.body);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async getDevelopmentPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const plans = await performanceService.getDevelopmentPlans(userId);
      res.json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  }
}
