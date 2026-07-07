import { db } from "../config/db.js";

export class NotificationService {
  static async getMy(userId, { is_read, limit=30 } = {}) {
    const where = ["user_id=?"]; const params = [userId];
    if (is_read !== undefined && is_read !== "") { where.push("is_read=?"); params.push(is_read); }
    const [rows] = await db.query(`SELECT * FROM Notifications WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`, [...params, Number(limit)]);
    return rows;
  }
  static async getUnreadCount(userId) {
    const [[{count}]] = await db.query("SELECT COUNT(*) AS count FROM Notifications WHERE user_id=? AND is_read=0", [userId]);
    return count;
  }
  static async markRead(id, userId) {
    const [[n]] = await db.query("SELECT id FROM Notifications WHERE id=? AND user_id=?", [id, userId]);
    if (!n) throw { status: 404, message: "Njoftime nuk u gjet" };
    await db.query("UPDATE Notifications SET is_read=1 WHERE id=?", [id]);
  }
  static async markAllRead(userId) {
    await db.query("UPDATE Notifications SET is_read=1 WHERE user_id=?", [userId]);
  }
}
