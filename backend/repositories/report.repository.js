import { db } from "../config/db.js";

export class ReportRepository {
  static async getSummaryParts(userId) {
    const [[inventory]] = await db.query(
      `SELECT COUNT(*) AS total_items,
              SUM(quantity) AS total_quantity,
              SUM(expiry_date < CURDATE()) AS expired,
              SUM(DATEDIFF(expiry_date,CURDATE()) BETWEEN 0 AND 3) AS expiring_soon
       FROM InventoryItems WHERE user_id=?`,
      [userId]
    );
    const [[waste]] = await db.query(
      "SELECT COUNT(*) AS events, COALESCE(SUM(quantity_wasted),0) AS total_kg FROM WasteLog WHERE user_id=?",
      [userId]
    );
    const [topIngredients] = await db.query(
      `SELECT i.name, SUM(cl.quantity_used) AS total_used
       FROM ConsumptionLog cl
       JOIN Ingredients i ON i.id=cl.ingredient_id
       WHERE cl.user_id=?
       GROUP BY i.id
       ORDER BY total_used DESC
       LIMIT 5`,
      [userId]
    );
    return { inventory, waste, topIngredients };
  }

  static async getWaste(userId, { from_date, to_date } = {}) {
    const where = ["wl.user_id=?"];
    const params = [userId];
    if (from_date) {
      where.push("DATE(wl.created_at)>=?");
      params.push(from_date);
    }
    if (to_date) {
      where.push("DATE(wl.created_at)<=?");
      params.push(to_date);
    }
    const [rows] = await db.query(
      `SELECT wl.id, wl.quantity_wasted, wl.reason, wl.created_at,
              i.name AS ingredient_name, c.name AS category_name
       FROM WasteLog wl
       JOIN Ingredients i ON i.id=wl.ingredient_id
       JOIN Categories c ON c.id=i.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY wl.created_at DESC`,
      params
    );
    return rows;
  }

  static async getConsumption(userId, { from_date, to_date } = {}) {
    const where = ["cl.user_id=?"];
    const params = [userId];
    if (from_date) {
      where.push("DATE(cl.created_at)>=?");
      params.push(from_date);
    }
    if (to_date) {
      where.push("DATE(cl.created_at)<=?");
      params.push(to_date);
    }
    const [rows] = await db.query(
      `SELECT cl.id, cl.quantity_used, cl.created_at,
              i.name AS ingredient_name, c.name AS category_name
       FROM ConsumptionLog cl
       JOIN Ingredients i ON i.id=cl.ingredient_id
       JOIN Categories c ON c.id=i.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY cl.created_at DESC
       LIMIT 100`,
      params
    );
    return rows;
  }

  static async getAuditLogs({ limit = 50, user_id, action, from_date, to_date } = {}) {
    const where = ["1=1"];
    const params = [];
    if (user_id) {
      where.push("al.user_id=?");
      params.push(user_id);
    }
    if (action) {
      where.push("al.action=?");
      params.push(action);
    }
    if (from_date) {
      where.push("DATE(al.created_at)>=?");
      params.push(from_date);
    }
    if (to_date) {
      where.push("DATE(al.created_at)<=?");
      params.push(to_date);
    }
    const [rows] = await db.query(
      `SELECT al.*, u.email
       FROM AuditLogs al
       LEFT JOIN Users u ON u.id=al.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [...params, Number(limit)]
    );
    return rows;
  }
}
