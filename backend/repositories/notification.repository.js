import { db } from "../config/db.js";

export class NotificationRepository {
  static async create({ user_id, type, title, message }) {
    const [result] = await db.query(
      "INSERT INTO Notifications (user_id,type,title,message,is_read) VALUES (?,?,?,?,0)",
      [user_id, type, title, message]
    );
    const [[notification]] = await db.query(
      "SELECT * FROM Notifications WHERE id=?",
      [result.insertId]
    );
    return notification;
  }

  static async findByUser(userId, { is_read, limit = 30 } = {}) {
    const where = ["user_id=?"];
    const params = [userId];
    if (is_read !== undefined && is_read !== "") {
      where.push("is_read=?");
      params.push(is_read);
    }
    const [rows] = await db.query(
      `SELECT * FROM Notifications WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
      [...params, Number(limit)]
    );
    return rows;
  }

  static async countUnread(userId) {
    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) AS count FROM Notifications WHERE user_id=? AND is_read=0",
      [userId]
    );
    return count;
  }

  static async findOwned(id, userId) {
    const [[notification]] = await db.query(
      "SELECT id FROM Notifications WHERE id=? AND user_id=?",
      [id, userId]
    );
    return notification;
  }

  static async markRead(id) {
    await db.query("UPDATE Notifications SET is_read=1 WHERE id=?", [id]);
  }

  static async markAllRead(userId) {
    await db.query("UPDATE Notifications SET is_read=1 WHERE user_id=?", [userId]);
  }
}
