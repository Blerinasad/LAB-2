import { db } from "../config/db.js";

// ─── AuditLog ──────────────────────────────────────────────
export class AuditLogModel {
  static async create({ user_id, action, entity, entity_id, old_value, new_value, ip_address }) {
    await db.query(
      `INSERT INTO AuditLogs (user_id, action, entity, entity_id, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id ?? null, action, entity, entity_id ?? null,
       old_value ? JSON.stringify(old_value) : null,
       new_value ? JSON.stringify(new_value) : null,
       ip_address ?? null]
    );
  }
  static async getAll(limit = 100) {
    const [rows] = await db.query(
      `SELECT al.*, u.first_name, u.last_name FROM AuditLogs al
       LEFT JOIN Users u ON u.id = al.user_id
       ORDER BY al.created_at DESC LIMIT ?`, [limit]
    );
    return rows;
  }
}

// ─── Notification ──────────────────────────────────────────
export class NotificationModel {
  static async getByUserId(userId) {
    const [rows] = await db.query(
      `SELECT * FROM Notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return rows;
  }
  static async create({ user_id, type, title, message }) {
    const [result] = await db.query(
      `INSERT INTO Notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)`,
      [user_id, type, title, message]
    );
    return result;
  }
  static async findById(id, userId) {
    const [rows] = await db.query(
      `SELECT * FROM Notifications WHERE id=? AND user_id=? LIMIT 1`, [id, userId]
    );
    return rows[0];
  }
  static async markRead(id, userId) {
    const [result] = await db.query(
      `UPDATE Notifications SET is_read=1 WHERE id=? AND user_id=?`, [id, userId]
    );
    return result;
  }
  static async markAllRead(userId) {
    await db.query(
      `UPDATE Notifications SET is_read=1 WHERE user_id=? AND is_read=0`, [userId]
    );
  }
  static async getUnreadCount(userId) {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM Notifications WHERE user_id=? AND is_read=0`, [userId]
    );
    return rows[0].count;
  }
}

// ─── Category ──────────────────────────────────────────────
export class CategoryModel {
  static async getAll() {
    const [rows] = await db.query(
      `SELECT * FROM Categories ORDER BY name ASC`
    );
    return rows;
  }
}

// ─── Ingredient ────────────────────────────────────────────
export class IngredientModel {
  static async getAll({ search, category_id } = {}) {
    let sql = `SELECT i.*, c.name AS category_name, c.color_hex
               FROM Ingredients i
               INNER JOIN Categories c ON c.id = i.category_id`;
    const params = [];
    const conditions = [];
    if (search) { conditions.push(`i.name LIKE ?`); params.push(`%${search}%`); }
    if (category_id) { conditions.push(`i.category_id = ?`); params.push(category_id); }
    if (conditions.length) sql += ` WHERE ` + conditions.join(" AND ");
    sql += ` ORDER BY i.name ASC`;
    const [rows] = await db.query(sql, params);
    return rows;
  }
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT i.*, c.name AS category_name FROM Ingredients i
       INNER JOIN Categories c ON c.id = i.category_id WHERE i.id=? LIMIT 1`, [id]
    );
    return rows[0];
  }
  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO Ingredients (category_id, name, unit, calories_per_100, shelf_life_days, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.category_id, data.name, data.unit, data.calories_per_100 ?? null,
       data.shelf_life_days ?? null, data.created_by, data.created_by]
    );
    return result;
  }
  static async update(id, data) {
    const [result] = await db.query(
      `UPDATE Ingredients SET category_id=?, name=?, unit=?, calories_per_100=?,
       shelf_life_days=?, updated_by=? WHERE id=?`,
      [data.category_id, data.name, data.unit, data.calories_per_100 ?? null,
       data.shelf_life_days ?? null, data.updated_by, id]
    );
    return result;
  }
  static async delete(id) {
    const [result] = await db.query(`DELETE FROM Ingredients WHERE id=?`, [id]);
    return result;
  }
}

// ─── Inventory ─────────────────────────────────────────────
export class InventoryModel {
  static async getAll({ user_id, search, category_id, expiring_days, location, page = 1, limit = 20 } = {}) {
    let sql = `SELECT ii.*, i.name AS ingredient_name, i.unit, c.name AS category_name, c.color_hex,
               DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
               FROM InventoryItems ii
               INNER JOIN Ingredients i ON i.id = ii.ingredient_id
               INNER JOIN Categories c ON c.id = i.category_id`;
    const params = [];
    const conditions = [];
    if (user_id) { conditions.push(`ii.user_id = ?`); params.push(user_id); }
    if (search) { conditions.push(`i.name LIKE ?`); params.push(`%${search}%`); }
    if (category_id) { conditions.push(`i.category_id = ?`); params.push(category_id); }
    if (location) { conditions.push(`ii.location = ?`); params.push(location); }
    if (expiring_days) {
      conditions.push(`ii.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`);
      params.push(Number(expiring_days));
    }
    if (conditions.length) sql += ` WHERE ` + conditions.join(" AND ");
    sql += ` ORDER BY ii.expiry_date ASC`;
    const countSql = sql.replace(/SELECT .+? FROM/, "SELECT COUNT(*) AS total FROM").replace(/ORDER BY .+$/, "");
    const [countRows] = await db.query(countSql, params);
    const total = countRows[0].total;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const [rows] = await db.query(sql, params);
    return { total, items: rows };
  }

  static async findById(id, userId) {
    const [rows] = await db.query(
      `SELECT ii.*, i.name AS ingredient_name, i.unit, c.name AS category_name,
              DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
       FROM InventoryItems ii
       INNER JOIN Ingredients i ON i.id = ii.ingredient_id
       INNER JOIN Categories c ON c.id = i.category_id
       WHERE ii.id=? AND ii.user_id=? LIMIT 1`,
      [id, userId]
    );
    return rows[0];
  }

  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO InventoryItems (user_id, ingredient_id, quantity, purchase_date, expiry_date, location, notes, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.ingredient_id, data.quantity, data.purchase_date,
       data.expiry_date, data.location ?? null, data.notes ?? null, data.user_id, data.user_id]
    );
    return result;
  }

  static async update(id, userId, data) {
    const [result] = await db.query(
      `UPDATE InventoryItems SET ingredient_id=?, quantity=?, purchase_date=?,
       expiry_date=?, location=?, notes=?, updated_by=? WHERE id=? AND user_id=?`,
      [data.ingredient_id, data.quantity, data.purchase_date, data.expiry_date,
       data.location ?? null, data.notes ?? null, userId, id, userId]
    );
    return result;
  }

  static async delete(id, userId) {
    const [result] = await db.query(
      `DELETE FROM InventoryItems WHERE id=? AND user_id=?`, [id, userId]
    );
    return result;
  }

  static async getExpiringItems(userId, days = 3) {
    const [rows] = await db.query(
      `SELECT ii.*, i.name AS ingredient_name, DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
       FROM InventoryItems ii
       INNER JOIN Ingredients i ON i.id = ii.ingredient_id
       WHERE ii.user_id=? AND ii.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY ii.expiry_date ASC`,
      [userId, days]
    );
    return rows;
  }

  static async getAvailableIngredients(userId) {
    const [rows] = await db.query(
      `SELECT ii.ingredient_id, i.name, SUM(ii.quantity) AS total_quantity, i.unit
       FROM InventoryItems ii
       INNER JOIN Ingredients i ON i.id = ii.ingredient_id
       WHERE ii.user_id=? AND ii.quantity > 0 AND ii.expiry_date >= CURDATE()
       GROUP BY ii.ingredient_id, i.name, i.unit`,
      [userId]
    );
    return rows;
  }
}

// ─── Recipe ────────────────────────────────────────────────
export class RecipeModel {
  static async getAll({ search, difficulty, is_public = 1, page = 1, limit = 20 } = {}) {
    let sql = `SELECT r.*, u.first_name AS author_first, u.last_name AS author_last,
               COUNT(ri.id) AS ingredient_count
               FROM Recipes r
               LEFT JOIN Users u ON u.id = r.created_by
               LEFT JOIN RecipeIngredients ri ON ri.recipe_id = r.id`;
    const params = [];
    const conditions = [];
    if (is_public !== undefined) { conditions.push(`r.is_public = ?`); params.push(is_public); }
    if (search) { conditions.push(`r.title LIKE ?`); params.push(`%${search}%`); }
    if (difficulty) { conditions.push(`r.difficulty = ?`); params.push(difficulty); }
    if (conditions.length) sql += ` WHERE ` + conditions.join(" AND ");
    sql += ` GROUP BY r.id ORDER BY r.created_at DESC`;
    const countSql = `SELECT COUNT(*) AS total FROM Recipes r` +
      (conditions.length ? ` WHERE ` + conditions.join(" AND ") : "");
    const [countRows] = await db.query(countSql, params.filter((_, i) => i < conditions.length));
    const total = countRows[0].total;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), (Number(page) - 1) * Number(limit));
    const [rows] = await db.query(sql, params);
    return { total, items: rows };
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT r.*, u.first_name AS author_first, u.last_name AS author_last
       FROM Recipes r LEFT JOIN Users u ON u.id = r.created_by WHERE r.id=? LIMIT 1`, [id]
    );
    if (!rows[0]) return null;
    const [ingredients] = await db.query(
      `SELECT ri.*, i.name AS ingredient_name, i.unit AS default_unit, c.name AS category_name
       FROM RecipeIngredients ri
       INNER JOIN Ingredients i ON i.id = ri.ingredient_id
       INNER JOIN Categories c ON c.id = i.category_id
       WHERE ri.recipe_id=? ORDER BY ri.is_optional ASC, i.name ASC`, [id]
    );
    return { ...rows[0], ingredients };
  }

  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO Recipes (title, description, instructions, prep_time_min, cook_time_min, servings, difficulty, is_public, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.title, data.description ?? null, data.instructions, data.prep_time_min ?? null,
       data.cook_time_min ?? null, data.servings ?? null, data.difficulty ?? "medium",
       data.is_public ?? 1, data.created_by, data.created_by]
    );
    return result;
  }

  static async addIngredient(recipe_id, data) {
    await db.query(
      `INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity, unit, is_optional, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recipe_id, data.ingredient_id, data.quantity, data.unit, data.is_optional ?? 0, data.created_by, data.created_by]
    );
  }

  static async update(id, data) {
    const [result] = await db.query(
      `UPDATE Recipes SET title=?, description=?, instructions=?, prep_time_min=?,
       cook_time_min=?, servings=?, difficulty=?, is_public=?, updated_by=? WHERE id=?`,
      [data.title, data.description ?? null, data.instructions, data.prep_time_min ?? null,
       data.cook_time_min ?? null, data.servings ?? null, data.difficulty ?? "medium",
       data.is_public ?? 1, data.updated_by, id]
    );
    return result;
  }

  static async delete(id) {
    const [result] = await db.query(`DELETE FROM Recipes WHERE id=?`, [id]);
    return result;
  }
}

// ─── MealPlan ──────────────────────────────────────────────
export class MealPlanModel {
  static async getByUserId(userId, { search, status, week_start, from_date, to_date, sort = "week_start", order = "desc" } = {}) {
    const allowedSort = { title: "title", week_start: "week_start", week_end: "week_end", status: "status", created_at: "created_at" };
    const sortColumn = allowedSort[sort] || "week_start";
    const sortOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    let sql = `SELECT * FROM MealPlans WHERE user_id=?`;
    const params = [userId];
    if (search?.trim()) { sql += ` AND title LIKE ?`; params.push(`%${search.trim()}%`); }
    if (status) { sql += ` AND status = ?`; params.push(status); }
    if (week_start) { sql += ` AND week_start = ?`; params.push(week_start); }
    if (from_date) { sql += ` AND week_start >= ?`; params.push(from_date); }
    if (to_date) { sql += ` AND week_start <= ?`; params.push(to_date); }
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    const [rows] = await db.query(sql, params);
    return rows;
  }
  static async getByIdAndUser(id, userId) {
    const [rows] = await db.query(
      `SELECT * FROM MealPlans WHERE id=? AND user_id=? LIMIT 1`, [id, userId]
    );
    if (!rows[0]) return null;
    const [days] = await db.query(
      `SELECT mpd.*, r.title AS recipe_title, r.prep_time_min, r.cook_time_min, r.difficulty
       FROM MealPlanDays mpd
       INNER JOIN Recipes r ON r.id = mpd.recipe_id
       WHERE mpd.meal_plan_id=? ORDER BY mpd.day_of_week ASC, mpd.meal_type ASC`, [id]
    );
    return { ...rows[0], days };
  }
  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO MealPlans (user_id, title, week_start, week_end, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.title, data.week_start, data.week_end,
       data.status ?? "draft", data.user_id, data.user_id]
    );
    return result;
  }
  static async update(id, userId, data) {
    const [result] = await db.query(
      `UPDATE MealPlans SET title=?, status=?, updated_by=? WHERE id=? AND user_id=?`,
      [data.title, data.status, userId, id, userId]
    );
    return result;
  }
  static async delete(id, userId) {
    const [result] = await db.query(
      `DELETE FROM MealPlans WHERE id=? AND user_id=?`, [id, userId]
    );
    return result;
  }
  static async addDay(data) {
    const [result] = await db.query(
      `INSERT INTO MealPlanDays (meal_plan_id, recipe_id, day_of_week, meal_type, servings, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.meal_plan_id, data.recipe_id, data.day_of_week, data.meal_type,
       data.servings ?? 1, data.user_id, data.user_id]
    );
    return result;
  }
  static async removeDay(dayId, userId) {
    const [result] = await db.query(
      `DELETE mpd FROM MealPlanDays mpd
       INNER JOIN MealPlans mp ON mp.id = mpd.meal_plan_id
       WHERE mpd.id=? AND mp.user_id=?`, [dayId, userId]
    );
    return result;
  }

  // Merr të gjithë ingredientët e nevojshëm nga një plan (për auto shopping list)
  static async getRequiredIngredients(mealPlanId) {
    const [rows] = await db.query(
      `SELECT ri.ingredient_id, i.name AS ingredient_name, i.unit,
              SUM(ri.quantity * mpd.servings) AS total_needed
       FROM MealPlanDays mpd
       INNER JOIN RecipeIngredients ri ON ri.recipe_id = mpd.recipe_id
       INNER JOIN Ingredients i ON i.id = ri.ingredient_id
       WHERE mpd.meal_plan_id=? AND ri.is_optional=0
       GROUP BY ri.ingredient_id, i.name, i.unit`, [mealPlanId]
    );
    return rows;
  }
}

// ─── ShoppingList ──────────────────────────────────────────
export class ShoppingListModel {
  static async getByUserId(userId, { search, status, from_date, to_date, sort = "created_at", order = "desc" } = {}) {
    const allowedSort = { title: "sl.title", status: "sl.status", created_at: "sl.created_at", total_items: "total_items", purchased_items: "purchased_items" };
    const sortColumn = allowedSort[sort] || "sl.created_at";
    const sortOrder = String(order).toLowerCase() === "asc" ? "ASC" : "DESC";

    let sql = `SELECT sl.*, COUNT(sli.id) AS total_items,
              COALESCE(SUM(CASE WHEN sli.is_purchased=1 THEN 1 ELSE 0 END), 0) AS purchased_items,
              COALESCE(SUM(CASE WHEN sli.is_purchased=0 THEN 1 ELSE 0 END), 0) AS pending_items
       FROM ShoppingLists sl
       LEFT JOIN ShoppingListItems sli ON sli.shopping_list_id = sl.id
       WHERE sl.user_id=?`;
    const params = [userId];
    if (search?.trim()) { sql += ` AND sl.title LIKE ?`; params.push(`%${search.trim()}%`); }
    if (status) { sql += ` AND sl.status = ?`; params.push(status); }
    if (from_date) { sql += ` AND DATE(sl.created_at) >= ?`; params.push(from_date); }
    if (to_date) { sql += ` AND DATE(sl.created_at) <= ?`; params.push(to_date); }
    sql += ` GROUP BY sl.id ORDER BY ${sortColumn} ${sortOrder}`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async getByIdAndUser(id, userId) {
    const [rows] = await db.query(
      `SELECT * FROM ShoppingLists WHERE id=? AND user_id=? LIMIT 1`, [id, userId]
    );
    if (!rows[0]) return null;
    const [items] = await db.query(
      `SELECT sli.*, i.name AS ingredient_name, i.unit AS default_unit, c.name AS category_name, c.color_hex
       FROM ShoppingListItems sli
       INNER JOIN Ingredients i ON i.id = sli.ingredient_id
       INNER JOIN Categories c ON c.id = i.category_id
       WHERE sli.shopping_list_id=?
       ORDER BY sli.is_purchased ASC, c.name ASC, i.name ASC`, [id]
    );
    return { ...rows[0], items };
  }

  static async create({ user_id, title }) {
    const [result] = await db.query(
      `INSERT INTO ShoppingLists (user_id, title, status, created_by, updated_by)
       VALUES (?, ?, 'active', ?, ?)`, [user_id, title, user_id, user_id]
    );
    return result;
  }

  static async updateStatus(id, userId, status) {
    const [result] = await db.query(
      `UPDATE ShoppingLists SET status=?, updated_by=? WHERE id=? AND user_id=?`,
      [status, userId, id, userId]
    );
    return result;
  }

  static async delete(id, userId) {
    const [result] = await db.query(
      `DELETE FROM ShoppingLists WHERE id=? AND user_id=?`, [id, userId]
    );
    return result;
  }

  static async addItem({ shopping_list_id, ingredient_id, quantity_needed, unit, user_id }) {
    const [result] = await db.query(
      `INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity_needed = quantity_needed + VALUES(quantity_needed), unit = VALUES(unit), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
      [shopping_list_id, ingredient_id, quantity_needed, unit, user_id, user_id]
    );
    return result;
  }

  static async markPurchased(itemId, listId) {
    const [result] = await db.query(
      `UPDATE ShoppingListItems SET is_purchased = CASE WHEN is_purchased=1 THEN 0 ELSE 1 END WHERE id=? AND shopping_list_id=?`, [itemId, listId]
    );
    return result;
  }

  static async deleteItem(itemId, listId) {
    const [result] = await db.query(
      `DELETE FROM ShoppingListItems WHERE id=? AND shopping_list_id=?`, [itemId, listId]
    );
    return result;
  }

  static async getLowInventorySuggestions(userId, limit = 10) {
    const [rows] = await db.query(
      `SELECT ii.ingredient_id, i.name AS ingredient_name, i.unit, c.name AS category_name,
              SUM(ii.quantity) AS current_quantity, MIN(ii.expiry_date) AS nearest_expiry,
              DATEDIFF(MIN(ii.expiry_date), CURDATE()) AS days_until_expiry
       FROM InventoryItems ii
       INNER JOIN Ingredients i ON i.id = ii.ingredient_id
       INNER JOIN Categories c ON c.id = i.category_id
       WHERE ii.user_id=? AND ii.quantity > 0
       GROUP BY ii.ingredient_id, i.name, i.unit, c.name
       HAVING current_quantity <= 2 OR days_until_expiry <= 3
       ORDER BY days_until_expiry ASC, current_quantity ASC
       LIMIT ?`, [userId, Number(limit)]
    );
    return rows;
  }
}


// ─── Marketplace / Store Orders ───────────────────────────
export class MarketplaceModel {
  static async getStores() {
    const [rows] = await db.query(`SELECT id, name, address, phone, is_active FROM Stores WHERE is_active=1 ORDER BY name ASC`);
    return rows;
  }

  static async findStoreById(id) {
    const [rows] = await db.query(`SELECT * FROM Stores WHERE id=? AND is_active=1 LIMIT 1`, [id]);
    return rows[0];
  }

  static async createOrderFromShoppingList({ user_id, shopping_list_id, store_id, delivery_address, delivery_note, payment_method }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [items] = await conn.query(
        `SELECT sli.ingredient_id, i.name AS ingredient_name, sli.quantity_needed, sli.unit,
                COALESCE(spp.price, 1.00) AS unit_price
         FROM ShoppingListItems sli
         INNER JOIN Ingredients i ON i.id = sli.ingredient_id
         INNER JOIN ShoppingLists sl ON sl.id = sli.shopping_list_id
         LEFT JOIN StoreProductPrices spp ON spp.store_id=? AND spp.ingredient_id=sli.ingredient_id AND spp.is_available=1
         WHERE sl.id=? AND sl.user_id=? AND sli.is_purchased=0`,
        [store_id, shopping_list_id, user_id]
      );
      if (!items.length) throw new Error("Lista nuk ka artikuj aktivë për porosi");
      const subtotal = items.reduce((sum, item) => sum + Number(item.quantity_needed) * Number(item.unit_price), 0);
      const deliveryFee = subtotal >= 30 ? 0 : 2.5;
      const estimatedTotal = Number((subtotal + deliveryFee).toFixed(2));
      const [order] = await conn.query(
        `INSERT INTO StoreOrders (user_id, shopping_list_id, store_id, status, delivery_address, notes, delivery_fee, total_amount, created_by, updated_by)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
        [user_id, shopping_list_id, store_id, delivery_address, delivery_note, deliveryFee.toFixed(2), estimatedTotal.toFixed(2), user_id, user_id]
      );
      for (const item of items) {
        const lineSubtotal = Number(item.quantity_needed) * Number(item.unit_price);
        await conn.query(
          `INSERT INTO StoreOrderItems (order_id, ingredient_id, quantity, unit, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order.insertId, item.ingredient_id, item.quantity_needed, item.unit, Number(item.unit_price).toFixed(2), lineSubtotal.toFixed(2)]
        );
      }
      await conn.commit();
      return { insertId: order.insertId, estimated_total: estimatedTotal, delivery_fee: deliveryFee };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async getOrdersForUser(userId) {
    const [rows] = await db.query(
      `SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method,
              s.name AS store_name, COUNT(soi.id) AS total_items
       FROM StoreOrders so
       INNER JOIN Stores s ON s.id = so.store_id
       LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
       WHERE so.user_id=?
       GROUP BY so.id
       ORDER BY so.created_at DESC`, [userId]
    );
    return rows;
  }

  static async getOrdersForStoreManager({ status, limit = 100 } = {}) {
    let sql = `SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method,
              s.name AS store_name, u.first_name, u.last_name,
              cu.first_name AS courier_first_name, cu.last_name AS courier_last_name,
              COUNT(soi.id) AS total_items
       FROM StoreOrders so
       INNER JOIN Stores s ON s.id = so.store_id
       INNER JOIN Users u ON u.id = so.user_id
       LEFT JOIN Users cu ON cu.id = so.courier_id
       LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id`;
    const params = [];
    if (status) { sql += ` WHERE so.status=?`; params.push(status); }
    sql += ` GROUP BY so.id ORDER BY so.created_at DESC LIMIT ?`;
    params.push(Number(limit));
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async getOrdersForCourier({ courierId, status, limit = 100 } = {}) {
    let sql = `SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method,
              s.name AS store_name, u.first_name, u.last_name, COUNT(soi.id) AS total_items
       FROM StoreOrders so
       INNER JOIN Stores s ON s.id = so.store_id
       INNER JOIN Users u ON u.id = so.user_id
       LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
       WHERE (so.courier_id=? OR (so.courier_id IS NULL AND so.status IN ('accepted','preparing')))`;
    const params = [courierId];
    if (status) { sql += ` AND so.status=?`; params.push(status); }
    sql += ` GROUP BY so.id ORDER BY FIELD(so.status,'preparing','accepted','out_for_delivery','delivered','cancelled','rejected','pending'), so.created_at DESC LIMIT ?`;
    params.push(Number(limit));
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async findOrderById(id) {
    const [rows] = await db.query(
      `SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method,
              s.name AS store_name,
              cu.first_name AS courier_first_name, cu.last_name AS courier_last_name
       FROM StoreOrders so
       INNER JOIN Stores s ON s.id=so.store_id
       LEFT JOIN Users cu ON cu.id=so.courier_id
       WHERE so.id=? LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    const [items] = await db.query(
      `SELECT soi.*, i.name AS ingredient_name, soi.quantity AS quantity_needed, soi.total_price AS subtotal
       FROM StoreOrderItems soi
       INNER JOIN Ingredients i ON i.id=soi.ingredient_id
       WHERE soi.order_id=?
       ORDER BY soi.id ASC`,
      [id]
    );
    return { ...rows[0], items };
  }

  static async updateOrderStatus(id, status, userId) {
    const [result] = await db.query(
      `UPDATE StoreOrders SET status=?, updated_by=? WHERE id=?`, [status, userId, id]
    );
    return result;
  }

  static async claimOrder(id, courierId) {
    const [result] = await db.query(
      `UPDATE StoreOrders SET courier_id=?, updated_by=? WHERE id=? AND (courier_id IS NULL OR courier_id=?)`,
      [courierId, courierId, id, courierId]
    );
    return result;
  }

  static async rebuyOrder(orderId, userId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [[order]] = await conn.query(`SELECT * FROM StoreOrders WHERE id=? AND user_id=? LIMIT 1`, [orderId, userId]);
      if (!order) throw new Error("Porosia nuk u gjet");
      const [items] = await conn.query(`SELECT * FROM StoreOrderItems WHERE order_id=?`, [orderId]);
      if (!items.length) throw new Error("Porosia nuk ka artikuj");
      const [list] = await conn.query(
        `INSERT INTO ShoppingLists (user_id, title, status, created_by, updated_by) VALUES (?, ?, 'active', ?, ?)`,
        [userId, `Riblerje nga porosia #${orderId}`, userId, userId]
      );
      for (const item of items) {
        await conn.query(
          `INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [list.insertId, item.ingredient_id, item.quantity, item.unit, userId, userId]
        );
      }
      await conn.commit();
      return { shopping_list_id: list.insertId };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async getMonthlySpending(userId) {
    const [rows] = await db.query(
      `SELECT YEAR(created_at) AS year, MONTH(created_at) AS month,
              COUNT(*) AS order_count, COALESCE(SUM(total_amount),0) AS total_spent
       FROM StoreOrders
       WHERE user_id=? AND status IN ('accepted','preparing','out_for_delivery','delivered')
       GROUP BY YEAR(created_at), MONTH(created_at)
       ORDER BY year ASC, month ASC`, [userId]
    );
    return rows;
  }

  static async getBudgetForecast(userId, targetMonth, targetYear) {
    const history = await this.getMonthlySpending(userId);
    const sameMonth = history.filter((r) => Number(r.month) === Number(targetMonth));
    const basis = sameMonth.length ? sameMonth : history.slice(-6);
    const avg = basis.length ? basis.reduce((sum, r) => sum + Number(r.total_spent || 0), 0) / basis.length : 0;
    const trend = basis.length >= 2 ? (Number(basis.at(-1).total_spent || 0) - Number(basis[0].total_spent || 0)) / Math.max(1, basis.length - 1) : 0;
    const predicted = Math.max(0, avg + trend);
    const reserve = predicted * 1.12;
    return {
      target_month: Number(targetMonth),
      target_year: Number(targetYear),
      predicted_amount: Number(predicted.toFixed(2)),
      recommended_reserve: Number(reserve.toFixed(2)),
      basis: basis.map((r) => ({ year: r.year, month: r.month, total_spent: Number(r.total_spent), order_count: r.order_count })),
      method: basis.length ? "historical_month_average_with_trend" : "not_enough_data",
    };
  }
}

// ─── Reports ───────────────────────────────────────────────
export class ReportModel {
  static async getSummary(userId, fromDate, toDate) {
    const [[inventory]] = await db.query(
      `SELECT COUNT(*) AS total_items,
              SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 1 ELSE 0 END) AS expiring_soon,
              SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired
       FROM InventoryItems WHERE user_id=?`, [userId]
    );
    const [[waste]] = await db.query(
      `SELECT COUNT(*) AS events, COALESCE(SUM(quantity_wasted), 0) AS total_kg
       FROM WasteLog WHERE user_id=?`, [userId]
    );

    const dateCondition = [];
    const dateParams = [userId];
    if (fromDate) { dateCondition.push(`AND cl.consumed_at >= ?`); dateParams.push(fromDate); }
    if (toDate) { dateCondition.push(`AND cl.consumed_at <= ?`); dateParams.push(toDate); }

    const [topIngredients] = await db.query(
      `SELECT i.name, SUM(cl.quantity_used) AS total_used
       FROM ConsumptionLog cl
       INNER JOIN Ingredients i ON i.id = cl.ingredient_id
       WHERE cl.user_id=? ${dateCondition.join(" ")}
       GROUP BY i.id, i.name ORDER BY total_used DESC LIMIT 5`, dateParams
    );

    const wasteParams = [userId];
    let wasteRange = `AND wasted_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
    if (fromDate || toDate) {
      wasteRange = "";
      if (fromDate) { wasteRange += ` AND wasted_at >= ?`; wasteParams.push(fromDate); }
      if (toDate) { wasteRange += ` AND wasted_at <= ?`; wasteParams.push(toDate); }
    }
    const [weeklyWaste] = await db.query(
      `SELECT DATE(wasted_at) AS date, SUM(quantity_wasted) AS kg
       FROM WasteLog WHERE user_id=? ${wasteRange}
       GROUP BY DATE(wasted_at) ORDER BY date ASC`, wasteParams
    );
    return { inventory, waste, top_ingredients: topIngredients, weekly_waste: weeklyWaste };
  }

  static async getWaste(userId, fromDate, toDate) {
    let sql = `SELECT wl.*, i.name AS ingredient_name
               FROM WasteLog wl INNER JOIN Ingredients i ON i.id = wl.ingredient_id
               WHERE wl.user_id=?`;
    const params = [userId];
    if (fromDate) { sql += ` AND wl.wasted_at >= ?`; params.push(fromDate); }
    if (toDate) { sql += ` AND wl.wasted_at <= ?`; params.push(toDate); }
    sql += ` ORDER BY wl.wasted_at DESC LIMIT 500`;
    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async getConsumption(userId, fromDate, toDate) {
    let sql = `SELECT cl.*, i.name AS ingredient_name
               FROM ConsumptionLog cl INNER JOIN Ingredients i ON i.id = cl.ingredient_id
               WHERE cl.user_id=?`;
    const params = [userId];
    if (fromDate) { sql += ` AND cl.consumed_at >= ?`; params.push(fromDate); }
    if (toDate) { sql += ` AND cl.consumed_at <= ?`; params.push(toDate); }
    sql += ` ORDER BY cl.consumed_at DESC LIMIT 500`;
    const [rows] = await db.query(sql, params);
    return rows;
  }
}
