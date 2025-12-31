"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BenefitsController = void 0;
const benefits_service_1 = require("../services/benefits.service");
const benefitsService = new benefits_service_1.BenefitsService();
class BenefitsController {
    async createBenefit(req, res, next) {
        try {
            const benefit = await benefitsService.createBenefit(req.body);
            res.status(201).json({ success: true, data: benefit });
        }
        catch (error) {
            next(error);
        }
    }
    async getBenefits(_req, res, next) {
        try {
            const benefits = await benefitsService.getBenefits();
            res.json({ success: true, data: benefits });
        }
        catch (error) {
            next(error);
        }
    }
    async enrollUser(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const enrollment = await benefitsService.enrollUser(userId, req.body.benefitId);
            res.status(201).json({ success: true, data: enrollment });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserEnrollments(req, res, next) {
        try {
            const userId = req.params.userId || req.user.id;
            const enrollments = await benefitsService.getUserEnrollments(userId);
            res.json({ success: true, data: enrollments });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BenefitsController = BenefitsController;
