import { Request, Response, NextFunction } from "express";
import notificationService from "./notification.service";
import { validationError } from "../../lib/errors";

export class NotificationController {
  private service = notificationService;

  /**
   * GET /notifications
   */
  async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw validationError("User ID is required");

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const result = await this.service.getNotificationsForUser(userId, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /notifications/:id/read
   */
  async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw validationError("User ID is required");
      const notificationId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!notificationId) throw validationError("Notification ID is required");

      await this.service.markAsRead(userId, notificationId);
      res.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications/read-all
   */
  async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw validationError("User ID is required");

      await this.service.markAllAsRead(userId);
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
