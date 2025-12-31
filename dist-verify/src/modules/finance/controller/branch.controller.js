"use strict";
/**
 * Branch Module - Controller Layer
 * Handles HTTP requests for branch dashboard operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchController = void 0;
const branch_service_1 = require("../service/branch.service");
const errors_1 = require("../../../lib/errors");
class BranchController {
    constructor() {
        this.service = new branch_service_1.BranchService();
    }
    /**
     * GET /branches/:id/dashboard
     * Get complete branch dashboard with KPIs and metrics
     */
    async getDashboard(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("Branch ID is required");
            }
            const dashboard = await this.service.getBranchDashboard(id);
            res.status(200).json({
                success: true,
                data: dashboard,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BranchController = BranchController;
