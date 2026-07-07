import { db } from "../config/db.js";

export class DashboardRepository {
  static async getSummaryParts(userId, includeAdmin) {
    const [[inventory]] = await db.query(`
      SELECT
        COUNT(*) AS total_items,
        SUM(quantity) AS total_quantity,
        SUM(expiry_date < CURDATE()) AS expired,
        SUM(DATEDIFF(expiry_date,CURDATE()) BETWEEN 0 AND 3) AS expiring_soon,
        SUM(DATEDIFF(expiry_date,CURDATE()) BETWEEN 0 AND 7) AS expiring_week,
        SUM(quantity < 0.5) AS low_stock
      FROM InventoryItems WHERE user_id=?`, [userId]);

    const [[recipes]] = await db.query(
      "SELECT COUNT(*) AS total FROM Recipes WHERE is_public=1 OR created_by=?",
      [userId]
    );
    const [[mealPlans]] = await db.query(
      "SELECT COUNT(*) AS active FROM MealPlans WHERE user_id=? AND status='active'",
      [userId]
    );
    const [[shopping]] = await db.query(`
      SELECT COUNT(DISTINCT sl.id) AS active_lists,
             SUM(sli.is_purchased=0) AS pending_items
      FROM ShoppingLists sl
      LEFT JOIN ShoppingListItems sli ON sli.shopping_list_id=sl.id
      WHERE sl.user_id=? AND sl.status='active'`, [userId]);
    const [[orders]] = await db.query(
      "SELECT COUNT(*) AS total, SUM(status='pending') AS pending FROM StoreOrders WHERE user_id=?",
      [userId]
    );
    const [[waste]] = await db.query(
      "SELECT COALESCE(SUM(quantity_wasted),0) AS total_kg FROM WasteLog WHERE user_id=?",
      [userId]
    );
    const [[notifications]] = await db.query(
      "SELECT COUNT(*) AS unread FROM Notifications WHERE user_id=? AND is_read=0",
      [userId]
    );

    let admin = null;
    if (includeAdmin) {
      const [[users]] = await db.query("SELECT COUNT(*) AS total, SUM(is_active) AS active FROM Users");
      const [[adminOrders]] = await db.query(
        "SELECT COUNT(*) AS total, SUM(total_amount) AS revenue FROM StoreOrders WHERE status='delivered'"
      );
      admin = { users, orders: adminOrders };
    }

    return { inventory, recipes, mealPlans, shopping, orders, waste, notifications, admin };
  }

  static async getActivity(userId, limit = 10) {
    const [rows] = await db.query(`
      SELECT 'audit' AS source, action AS type, entity AS label,
             created_at, NULL AS extra
      FROM AuditLogs WHERE user_id=?
      UNION ALL
      SELECT 'notif', type, title, created_at, message
      FROM Notifications WHERE user_id=?
      ORDER BY created_at DESC LIMIT ?`,
      [userId, userId, Number(limit)]);
    return rows;
  }

  static async getCharts(userId) {
    const [byCategory] = await db.query(`
      SELECT c.name AS category, COUNT(ii.id) AS items, SUM(ii.quantity) AS total_qty
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id=ii.ingredient_id
      JOIN Categories c ON c.id=i.category_id
      WHERE ii.user_id=?
      GROUP BY c.id, c.name ORDER BY items DESC`, [userId]);

    const [expiry] = await db.query(`
      SELECT DATEDIFF(expiry_date, CURDATE()) AS days_left, COUNT(*) AS count
      FROM InventoryItems
      WHERE user_id=? AND expiry_date >= CURDATE() AND DATEDIFF(expiry_date,CURDATE()) <= 14
      GROUP BY days_left ORDER BY days_left ASC`, [userId]);

    const [orders] = await db.query(`
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
             COUNT(*) AS count, SUM(total_amount) AS total
      FROM StoreOrders WHERE user_id=?
      GROUP BY month ORDER BY month DESC LIMIT 6`, [userId]);

    return { by_category: byCategory, expiry_timeline: expiry, orders_monthly: orders };
  }
}
