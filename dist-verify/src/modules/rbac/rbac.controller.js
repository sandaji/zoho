"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacController = void 0;
const rbac_service_1 = require("./rbac.service");
class RbacController {
    constructor() {
        this.rbacService = new rbac_service_1.RbacService();
    }
    async listRoles(_req, res, next) {
        try {
            const roles = await this.rbacService.listRoles();
            res.json({ success: true, data: roles });
        }
        catch (error) {
            next(error);
        }
    }
    async getRole(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new Error("ID is required");
            const role = await this.rbacService.getRoleById(id);
            res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async createRole(req, res, next) {
        try {
            const role = await this.rbacService.createRole(req.body);
            res.status(201).json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRole(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new Error("ID is required");
            const role = await this.rbacService.updateRole(id, req.body);
            res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteRole(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new Error("ID is required");
            await this.rbacService.deleteRole(id);
            res.json({ success: true, message: "Role deleted successfully" });
        }
        catch (error) {
            next(error);
        }
    }
    async listPermissions(_req, res, next) {
        try {
            const permissions = await this.rbacService.listPermissions();
            res.json({ success: true, data: permissions });
        }
        catch (error) {
            next(error);
        }
    }
    async syncRolePermissions(req, res, next) {
        try {
            const { id } = req.params;
            if (!id)
                throw new Error("ID is required");
            const { permissions } = req.body;
            const role = await this.rbacService.syncRolePermissions(id, permissions);
            res.json({ success: true, data: role });
        }
        catch (error) {
            next(error);
        }
    }
    async getUserRoles(req, res, next) {
        try {
            const { userId } = req.params;
            if (!userId)
                throw new Error("User ID is required");
            const roles = await this.rbacService.getUserRoles(userId);
            res.json({ success: true, data: roles });
        }
        catch (error) {
            next(error);
        }
    }
    async assignUserRoles(req, res, next) {
        try {
            const { userId } = req.params;
            if (!userId)
                throw new Error("User ID is required");
            const { roles } = req.body;
            const result = await this.rbacService.assignUserRoles(userId, roles);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RbacController = RbacController;
