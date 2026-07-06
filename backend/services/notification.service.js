import { NotificationRepository } from "../repositories/notification.repository.js";
import { db } from "../config/db.js";
import { getIO } from "../socket.js";

export class NotificationService {
  static async createAndEmit(userId, type, title, message, event = "notification:new") {
    const notification = await NotificationRepository.create({
      user_id: userId,
      type,
      title,
      message,
    });
    try {
      getIO()?.to(`user_${userId}`).emit(event, notification);
    } catch {}
    return notification;
  }

  static async createForRoles(roleNames, type, title, message) {
    const [users] = await db.query(
      `SELECT DISTINCT u.id
       FROM Users u
       JOIN UserRoles ur ON ur.user_id = u.id
       JOIN Roles r ON r.id = ur.role_id
       WHERE u.is_active=1 AND r.name IN (?)`,
      [roleNames]
    );
    const notifications = [];
    for (const user of users) {
      notifications.push(await this.createAndEmit(user.id, type, title, message));
    }
    return notifications;
  }

  static async getMy(userId, { is_read, limit=30 } = {}) {
    return NotificationRepository.findByUser(userId, { is_read, limit });
  }
  static async getUnreadCount(userId) {
    return NotificationRepository.countUnread(userId);
  }
  static async markRead(id, userId) {
    const notification = await NotificationRepository.findOwned(id, userId);
    if (!notification) throw { status: 404, message: "Njoftime nuk u gjet" };
    await NotificationRepository.markRead(id);
  }
  static async markAllRead(userId) {
    await NotificationRepository.markAllRead(userId);
  }
}
