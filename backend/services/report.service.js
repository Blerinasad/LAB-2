import { db } from "../config/db.js";

export class ReportService {
  static async getSystemSummary() {
    const [[users]] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(is_active=1) AS active_users,
        SUM(is_active=0) AS inactive_users
      FROM Users`);

    const [[orders]] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total_amount),0) AS total_revenue
      FROM StoreOrders`);

    const [ordersByStatus] = await db.query(`
      SELECT status, COUNT(*) AS total
      FROM StoreOrders
      GROUP BY status
      ORDER BY total DESC`);

    const [[marketplace]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Stores WHERE is_active=1) AS active_stores,
        (SELECT COUNT(*) FROM StoreProductPrices WHERE is_available=1) AS active_products,
        (SELECT COUNT(*) FROM StoreOrders WHERE DATE(created_at)=CURDATE()) AS orders_today
    `);

    const [auditSummary] = await db.query(`
      SELECT action, COUNT(*) AS total
      FROM AuditLogs
      GROUP BY action
      ORDER BY total DESC
      LIMIT 8`);

    const [systemActivity] = await db.query(`
      SELECT al.id, al.action, al.entity, al.entity_id, al.created_at, u.email
      FROM AuditLogs al
      LEFT JOIN Users u ON u.id=al.user_id
      ORDER BY al.created_at DESC
      LIMIT 10`);

    return {
      users,
      orders,
      orders_by_status: ordersByStatus,
      marketplace,
      audit_summary: auditSummary,
      system_activity: systemActivity,
    };
  }

  static async getManagerSummary() {
    const [[orders]] = await db.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(status='pending') AS pending_orders,
        SUM(status IN ('accepted','preparing','out_for_delivery','approved','ready_for_pickup','picked_up')) AS active_orders,
        SUM(status IN ('delivered','rejected','cancelled')) AS closed_orders
      FROM StoreOrders`);

    const [ordersByStatus] = await db.query(`
      SELECT status, COUNT(*) AS total
      FROM StoreOrders
      GROUP BY status
      ORDER BY total DESC`);

    const [[marketplace]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Stores WHERE is_active=1) AS active_stores,
        (SELECT COUNT(*) FROM StoreProductPrices WHERE is_available=1) AS active_products,
        (SELECT COUNT(*) FROM StoreOrders WHERE DATE(created_at)=CURDATE()) AS orders_today
    `);

    return { orders, orders_by_status: ordersByStatus, marketplace };
  }

  static async getSummary(userId) {
    const [[inv]] = await db.query(`SELECT COUNT(*) AS total_items, SUM(quantity) AS total_quantity, SUM(expiry_date < CURDATE()) AS expired, SUM(DATEDIFF(expiry_date,CURDATE()) BETWEEN 0 AND 3) AS expiring_soon FROM InventoryItems WHERE user_id=?`, [userId]);
    const [[waste]] = await db.query(`SELECT COUNT(*) AS events, COALESCE(SUM(quantity_wasted),0) AS total_kg FROM WasteLog WHERE user_id=?`, [userId]);
    const [top] = await db.query(`SELECT i.name, SUM(cl.quantity_used) AS total_used FROM ConsumptionLog cl JOIN Ingredients i ON i.id=cl.ingredient_id WHERE cl.user_id=? GROUP BY i.id ORDER BY total_used DESC LIMIT 5`, [userId]);
    return { inventory: inv, waste, top_ingredients: top };
  }

  static async getWaste(userId, { from_date, to_date } = {}) {
    const where = ["wl.user_id=?"]; const params = [userId];
    if (from_date) { where.push("DATE(wl.created_at)>=?"); params.push(from_date); }
    if (to_date) { where.push("DATE(wl.created_at)<=?"); params.push(to_date); }
    const [rows] = await db.query(`SELECT wl.id,wl.quantity_wasted,wl.reason,wl.created_at, i.name AS ingredient_name, c.name AS category_name FROM WasteLog wl JOIN Ingredients i ON i.id=wl.ingredient_id JOIN Categories c ON c.id=i.category_id WHERE ${where.join(" AND ")} ORDER BY wl.created_at DESC`, params);
    return rows;
  }

  static async getConsumption(userId, { from_date, to_date } = {}) {
    const where = ["cl.user_id=?"]; const params = [userId];
    if (from_date) { where.push("DATE(cl.created_at)>=?"); params.push(from_date); }
    if (to_date) { where.push("DATE(cl.created_at)<=?"); params.push(to_date); }
    const [rows] = await db.query(`SELECT cl.id,cl.quantity_used,cl.created_at, i.name AS ingredient_name, c.name AS category_name FROM ConsumptionLog cl JOIN Ingredients i ON i.id=cl.ingredient_id JOIN Categories c ON c.id=i.category_id WHERE ${where.join(" AND ")} ORDER BY cl.created_at DESC LIMIT 100`, params);
    return rows;
  }

  static async getAuditLogs({ limit=50, user_id, action, from_date, to_date } = {}) {
    const where = ["1=1"]; const params = [];
    if (user_id) { where.push("al.user_id=?"); params.push(user_id); }
    if (action) { where.push("al.action=?"); params.push(action); }
    if (from_date) { where.push("DATE(al.created_at)>=?"); params.push(from_date); }
    if (to_date) { where.push("DATE(al.created_at)<=?"); params.push(to_date); }
    const [rows] = await db.query(`SELECT al.*,u.email FROM AuditLogs al LEFT JOIN Users u ON u.id=al.user_id WHERE ${where.join(" AND ")} ORDER BY al.created_at DESC LIMIT ?`, [...params, Number(limit)]);
    return rows;
  }
}
