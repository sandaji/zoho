"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hr_controller_1 = require("../hr.controller");
const auth_1 = require("../../../lib/auth");
const rbac_middleware_1 = require("../../../middleware/rbac.middleware");
const recruitment_controller_1 = require("../controller/recruitment.controller");
const performance_controller_1 = require("../controller/performance.controller");
const benefits_controller_1 = require("../controller/benefits.controller");
const router = (0, express_1.Router)();
const hrController = new hr_controller_1.HRController();
const recruitmentController = new recruitment_controller_1.RecruitmentController();
const performanceController = new performance_controller_1.PerformanceController();
const benefitsController = new benefits_controller_1.BenefitsController();
// Dashboard Stats
router.get("/stats", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), hrController.getHRStats);
// Leave Types
router.get("/leaves/types", auth_1.authMiddleware, hrController.getLeaveTypes);
// My Leaves
router.get("/leaves/my-balance", auth_1.authMiddleware, hrController.getMyBalance);
router.post("/leaves/request", auth_1.authMiddleware, hrController.requestLeave);
router.get("/leaves/my-requests", auth_1.authMiddleware, hrController.getMyRequests);
// Recruitment
router.post("/recruitment/postings", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.recruitment.manage'), recruitmentController.createJobPosting);
router.get("/recruitment/postings", auth_1.authMiddleware, recruitmentController.getJobPostings);
router.get("/recruitment/postings/:id", auth_1.authMiddleware, recruitmentController.getJobPostingById);
router.post("/recruitment/applicants", auth_1.authMiddleware, recruitmentController.createApplicant);
router.patch("/recruitment/applicants/:id/status", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.recruitment.manage'), recruitmentController.updateApplicantStatus);
router.post("/recruitment/interviews", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.recruitment.manage'), recruitmentController.scheduleInterview);
router.patch("/recruitment/interviews/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.recruitment.manage'), recruitmentController.updateInterview);
// Performance
router.post("/performance/goals", auth_1.authMiddleware, performanceController.createGoal);
router.get("/performance/goals", auth_1.authMiddleware, performanceController.getGoals);
router.get("/performance/goals/:userId", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.performance.manage'), performanceController.getGoals);
router.patch("/performance/goals/:id/progress", auth_1.authMiddleware, performanceController.updateGoalProgress);
router.post("/performance/evaluations", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.performance.manage'), performanceController.createEvaluation);
router.get("/performance/evaluations", auth_1.authMiddleware, performanceController.getEvaluations);
router.get("/performance/evaluations/:userId", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.performance.manage'), performanceController.getEvaluations);
router.post("/performance/development-plans", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.performance.manage'), performanceController.createDevelopmentPlan);
router.get("/performance/development-plans", auth_1.authMiddleware, performanceController.getDevelopmentPlans);
router.get("/performance/development-plans/:userId", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.performance.manage'), performanceController.getDevelopmentPlans);
// Benefits
router.post("/benefits", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.benefits.manage'), benefitsController.createBenefit);
router.get("/benefits", auth_1.authMiddleware, benefitsController.getBenefits);
router.post("/benefits/enroll", auth_1.authMiddleware, benefitsController.enrollUser);
router.get("/benefits/my-enrollments", auth_1.authMiddleware, benefitsController.getUserEnrollments);
router.get("/benefits/enrollments/:userId", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.benefits.manage'), benefitsController.getUserEnrollments);
// Management (HR/Admin only)
router.get("/leaves/pending", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.leave.approve'), hrController.getPendingRequests);
router.patch("/leaves/requests/:id/status", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.leave.approve'), hrController.updateRequestStatus);
exports.default = router;
