import { Router } from "express";
import { HRController } from "../hr.controller";
import { authMiddleware as authenticate } from "../../../lib/auth";
import { requirePermission } from "../../../middleware/rbac.middleware";

import { RecruitmentController } from "../controller/recruitment.controller";
import { PerformanceController } from "../controller/performance.controller";
import { BenefitsController } from "../controller/benefits.controller";

const router = Router();
const hrController = new HRController();
const recruitmentController = new RecruitmentController();
const performanceController = new PerformanceController();
const benefitsController = new BenefitsController();

// Dashboard Stats
router.get("/stats", authenticate, requirePermission('hr.employee.view'), hrController.getHRStats as any);

// Leave Types
router.get("/leaves/types", authenticate, hrController.getLeaveTypes as any);

// My Leaves
router.get("/leaves/my-balance", authenticate, hrController.getMyBalance as any);
router.post("/leaves/request", authenticate, hrController.requestLeave as any);
router.get("/leaves/my-requests", authenticate, hrController.getMyRequests as any);

// Recruitment
router.post("/recruitment/postings", authenticate, requirePermission('hr.recruitment.manage'), recruitmentController.createJobPosting as any);
router.get("/recruitment/postings", authenticate, recruitmentController.getJobPostings as any);
router.get("/recruitment/postings/:id", authenticate, recruitmentController.getJobPostingById as any);
router.post("/recruitment/applicants", authenticate, recruitmentController.createApplicant as any);
router.patch("/recruitment/applicants/:id/status", authenticate, requirePermission('hr.recruitment.manage'), recruitmentController.updateApplicantStatus as any);
router.post("/recruitment/interviews", authenticate, requirePermission('hr.recruitment.manage'), recruitmentController.scheduleInterview as any);
router.patch("/recruitment/interviews/:id", authenticate, requirePermission('hr.recruitment.manage'), recruitmentController.updateInterview as any);

// Performance
router.post("/performance/goals", authenticate, performanceController.createGoal as any);
router.get("/performance/goals", authenticate, performanceController.getGoals as any);
router.get("/performance/goals/:userId", authenticate, requirePermission('hr.performance.manage'), performanceController.getGoals as any);
router.patch("/performance/goals/:id/progress", authenticate, performanceController.updateGoalProgress as any);

router.post("/performance/evaluations", authenticate, requirePermission('hr.performance.manage'), performanceController.createEvaluation as any);
router.get("/performance/evaluations", authenticate, performanceController.getEvaluations as any);
router.get("/performance/evaluations/:userId", authenticate, requirePermission('hr.performance.manage'), performanceController.getEvaluations as any);

router.post("/performance/development-plans", authenticate, requirePermission('hr.performance.manage'), performanceController.createDevelopmentPlan as any);
router.get("/performance/development-plans", authenticate, performanceController.getDevelopmentPlans as any);
router.get("/performance/development-plans/:userId", authenticate, requirePermission('hr.performance.manage'), performanceController.getDevelopmentPlans as any);

// Benefits
router.post("/benefits", authenticate, requirePermission('hr.benefits.manage'), benefitsController.createBenefit as any);
router.get("/benefits", authenticate, benefitsController.getBenefits as any);
router.post("/benefits/enroll", authenticate, benefitsController.enrollUser as any);
router.get("/benefits/my-enrollments", authenticate, benefitsController.getUserEnrollments as any);
router.get("/benefits/enrollments/:userId", authenticate, requirePermission('hr.benefits.manage'), benefitsController.getUserEnrollments as any);

// Management (HR/Admin only)
router.get("/leaves/pending", authenticate, requirePermission('hr.leave.approve'), hrController.getPendingRequests as any);
router.patch("/leaves/requests/:id/status", authenticate, requirePermission('hr.leave.approve'), hrController.updateRequestStatus as any);

export default router;
