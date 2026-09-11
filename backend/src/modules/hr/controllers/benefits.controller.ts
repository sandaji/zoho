
import { Request, Response, NextFunction } from "express";
import { BenefitsService } from "../services/benefits.service";

const benefitsService = new BenefitsService();

export class BenefitsController {
  async createBenefit(req: Request, res: Response, next: NextFunction) {
    try {
      const benefit = await benefitsService.createBenefit(req.body);
      res.status(201).json({ success: true, data: benefit });
    } catch (error) {
      next(error);
    }
  }

  async getBenefits(_req: Request, res: Response, next: NextFunction) {
    try {
      const benefits = await benefitsService.getBenefits();
      res.json({ success: true, data: benefits });
    } catch (error) {
      next(error);
    }
  }

  async enrollUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const enrollment = await benefitsService.enrollUser(userId, req.body.benefitId);
      res.status(201).json({ success: true, data: enrollment });
    } catch (error) {
      next(error);
    }
  }

  async getUserEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || (req as any).user.id;
      const enrollments = await benefitsService.getUserEnrollments(userId);
      res.json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  }
}
