"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentController = void 0;
const recruitment_service_1 = require("../services/recruitment.service");
const recruitmentService = new recruitment_service_1.RecruitmentService();
class RecruitmentController {
    async createJobPosting(req, res, next) {
        try {
            const posting = await recruitmentService.createJobPosting(req.body);
            res.status(201).json({ success: true, data: posting });
        }
        catch (error) {
            next(error);
        }
    }
    async getJobPostings(req, res, next) {
        try {
            const postings = await recruitmentService.getJobPostings(req.query);
            res.json({ success: true, data: postings });
        }
        catch (error) {
            next(error);
        }
    }
    async getJobPostingById(req, res, next) {
        try {
            const postingId = req.params.id;
            if (!postingId) {
                res.status(400).json({ success: false, error: "Job posting ID is required" });
                return;
            }
            const posting = await recruitmentService.getJobPostingById(postingId);
            res.json({ success: true, data: posting });
        }
        catch (error) {
            next(error);
        }
    }
    async createApplicant(req, res, next) {
        try {
            const applicant = await recruitmentService.createApplicant(req.body);
            res.status(201).json({ success: true, data: applicant });
        }
        catch (error) {
            next(error);
        }
    }
    async updateApplicantStatus(req, res, next) {
        try {
            const applicantId = req.params.id;
            if (!applicantId) {
                res.status(400).json({ success: false, error: "Applicant ID is required" });
                return;
            }
            const applicant = await recruitmentService.updateApplicantStatus(applicantId, req.body.status);
            res.json({ success: true, data: applicant });
        }
        catch (error) {
            next(error);
        }
    }
    async scheduleInterview(req, res, next) {
        try {
            const interview = await recruitmentService.scheduleInterview(req.body);
            res.status(201).json({ success: true, data: interview });
        }
        catch (error) {
            next(error);
        }
    }
    async updateInterview(req, res, next) {
        try {
            const interviewId = req.params.id;
            if (!interviewId) {
                res.status(400).json({ success: false, error: "Interview ID is required" });
                return;
            }
            const interview = await recruitmentService.updateInterview(interviewId, req.body);
            res.json({ success: true, data: interview });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RecruitmentController = RecruitmentController;
