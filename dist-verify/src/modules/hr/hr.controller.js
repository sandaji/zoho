"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HRController = void 0;
const leave_service_1 = require("./services/leave.service");
const errors_1 = require("../../lib/errors");
const service_1 = require("./service");
const leaveService = new leave_service_1.LeaveService();
const hrService = new service_1.HrService();
class HRController {
    /**
     * Get HR stats for dashboard
     */
    async getHRStats(req, res, next) {
        try {
            const stats = await hrService.getHRStats(req.authorizedBranchIds);
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get leave types
     */
    async getLeaveTypes(_req, res, next) {
        try {
            const types = await leaveService.getLeaveTypes();
            res.json({ success: true, data: types });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get user leave balance
     */
    async getMyBalance(req, res, next) {
        try {
            const userId = req.user.id;
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const balance = await leaveService.getLeaveBalance(userId, year);
            res.json({ success: true, data: balance });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Request leave
     */
    async requestLeave(req, res, next) {
        try {
            const userId = req.user.id;
            const request = await leaveService.createRequest(userId, req.body);
            res.status(201).json({ success: true, data: request });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get my requests
     */
    async getMyRequests(req, res, next) {
        try {
            const userId = req.user.id;
            const requests = await leaveService.getMyRequests(userId);
            res.json({ success: true, data: requests });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get pending requests (Manager/Admin)
     */
    async getPendingRequests(_req, res, next) {
        try {
            const requests = await leaveService.getPendingRequests();
            res.json({ success: true, data: requests });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update request status (Manager/Admin)
     */
    async updateRequestStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const processedBy = req.user.id;
            if (!['APPROVED', 'REJECTED'].includes(status)) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Invalid status");
            }
            const request = await leaveService.updateRequestStatus(id, status, processedBy);
            res.json({ success: true, data: request });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.HRController = HRController;
