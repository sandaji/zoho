import { prisma } from '@core/database/db';
import { logger } from '@core/utils/logger';

export class NotificationService {
  private prisma = prisma;

  /**
   * Create a single notification for a specific user
   */
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }): Promise<any> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          link: data.link,
        },
      });
      logger.info(
        { notificationId: notification.id, userId: data.userId, type: data.type },
        "Notification created",
      );
      return notification;
    } catch (err) {
      logger.error({ err, data }, "Failed to create notification");
      return null;
    }
  }

  /**
   * Create notifications for all users with a specific role code or permission.
   *
   * Recipients are looked up through RoleAssignment rather than User on purpose:
   * User is branch-isolated, so a query started from a branch user's request
   * could only ever find users in THAT branch and would silently never reach
   * head-office approvers.
   */
  async notifyRoleOrPermission(data: {
    roleCode?: string;
    permissionCode?: string;
    title: string;
    message: string;
    type: string;
    link?: string;
  }): Promise<void> {
    try {
      const assignments = await this.prisma.roleAssignment.findMany({
        where: {
          user: { isActive: true },
          ...(data.roleCode || data.permissionCode
            ? {
                role: {
                  ...(data.roleCode ? { code: data.roleCode } : {}),
                  ...(data.permissionCode
                    ? {
                        permissions: {
                          some: {
                            permission: { code: data.permissionCode },
                          },
                        },
                      }
                    : {}),
                },
              }
            : {}),
        },
        select: { userId: true },
      });

      const userIds = Array.from(new Set(assignments.map((a) => a.userId)));

      if (userIds.length > 0) {
        await this.prisma.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            title: data.title,
            message: data.message,
            type: data.type,
            link: data.link,
          })),
        });
        logger.info(
          { count: userIds.length, type: data.type },
          "Bulk notifications sent",
        );
      }
    } catch (err) {
      logger.error({ err, data }, "Failed to send bulk notifications");
    }
  }

  /**
   * Fetch recent notifications for a user with unread count
   */
  async getNotificationsForUser(
    userId: string,
    limit = 20,
  ): Promise<{ notifications: any[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<any> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export default new NotificationService();
