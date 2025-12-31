import { Request, Response, NextFunction } from "express";
import { RbacService } from "./rbac.service";

export class RbacController {
  private rbacService: RbacService;

  constructor() {
    this.rbacService = new RbacService();
  }

  async listRoles(_req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await this.rbacService.listRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID is required");
      const role = await this.rbacService.getRoleById(id);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await this.rbacService.createRole(req.body);
      res.status(201).json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID is required");
      const role = await this.rbacService.updateRole(id, req.body);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID is required");
      await this.rbacService.deleteRole(id);
      res.json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async listPermissions(_req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await this.rbacService.listPermissions();
      res.json({ success: true, data: permissions });
    } catch (error) {
      next(error);
    }
  }

  async syncRolePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID is required");
      const { permissions } = req.body;
      const role = await this.rbacService.syncRolePermissions(id, permissions);
      res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  async getUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) throw new Error("User ID is required");
      const roles = await this.rbacService.getUserRoles(userId);
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async assignUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) throw new Error("User ID is required");
      const { roles } = req.body;
      const result = await this.rbacService.assignUserRoles(userId, roles);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
