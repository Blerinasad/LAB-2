import { db } from "../config/db.js";

function buildInventoryWhere(userId, { search, category_id, location, expiring_days } = {}) {
  const where = ["ii.user_id = ?"];
  const params = [userId];
  if (search) {
    where.push("(i.name LIKE ? OR c.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    where.push("i.category_id = ?");
    params.push(category_id);
  }
  if (location) {
    where.push("ii.location = ?");
    params.push(location);
  }
  if (expiring_days) {
    where.push("DATEDIFF(ii.expiry_date, CURDATE()) <= ? AND ii.expiry_date >= CURDATE()");
    params.push(expiring_days);
  }
  return { where, params };
}

export class InventoryRepository {
  static async findAll(userId, filters = {}) {
    const { page = 1, limit = 20, sort = "expiry_date", order = "asc" } = filters;
    const offset = (Number(page) - 1) * Number(limit);
    const { where, params } = buildInventoryWhere(userId, filters);
    const allowed = ["expiry_date", "ingredient_name", "quantity", "purchase_date", "location"];
    const safeSort = allowed.includes(sort) ? sort : "expiry_date";
    const safeOrder = order === "desc" ? "DESC" : "ASC";
    const orderColumn = safeSort === "ingredient_name" ? "i.name" : `ii.${safeSort}`;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM InventoryItems ii
       JOIN Ingredients i ON i.id=ii.ingredient_id
       JOIN Categories c ON c.id=i.category_id
       WHERE ${where.join(" AND ")}`,
      params
    );
    const [rows] = await db.query(
      `SELECT ii.id, ii.quantity, ii.unit, ii.location, ii.purchase_date, ii.expiry_date,
              ii.notes, i.id AS ingredient_id, i.name AS ingredient_name,
              c.name AS category_name,
              DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
       FROM InventoryItems ii
       JOIN Ingredients i ON i.id = ii.ingredient_id
       JOIN Categories c ON c.id = i.category_id
       WHERE ${where.join(" AND ")}
       ORDER BY ${orderColumn} ${safeOrder}
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    return { rows, total, page: Number(page), limit: Number(limit) };
  }

  static async findById(id, userId) {
    const [[item]] = await db.query(`
      SELECT ii.*, i.name AS ingredient_name, c.name AS category_name,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id = ii.ingredient_id
      JOIN Categories c ON c.id = i.category_id
      WHERE ii.id=? AND ii.user_id=?`, [id, userId]);
    return item;
  }

  static async findExpiring(userId, days = 3) {
    const [rows] = await db.query(`
      SELECT ii.id, ii.quantity, ii.unit, ii.location, ii.expiry_date,
             i.name AS ingredient_name, c.name AS category_name,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id = ii.ingredient_id
      JOIN Categories c ON c.id = i.category_id
      WHERE ii.user_id=? AND DATEDIFF(ii.expiry_date, CURDATE()) <= ? AND ii.expiry_date >= CURDATE()
      ORDER BY ii.expiry_date ASC`, [userId, days]);
    return rows;
  }

  static async findIngredient(id) {
    const [[ingredient]] = await db.query("SELECT id, unit FROM Ingredients WHERE id=?", [id]);
    return ingredient;
  }

  static async createItem(userId, data, defaultUnit) {
    const [result] = await db.query(
      `INSERT INTO InventoryItems (user_id, ingredient_id, quantity, unit, purchase_date, expiry_date, location, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        userId,
        data.ingredient_id,
        data.quantity,
        data.unit || defaultUnit,
        data.purchase_date || new Date().toISOString().slice(0, 10),
        data.expiry_date,
        data.location || "Fridge",
        data.notes || null,
      ]
    );
    return result.insertId;
  }

  static async updateItem(id, userId, data) {
    await db.query(
      `UPDATE InventoryItems
       SET quantity=COALESCE(?,quantity),
           unit=COALESCE(?,unit),
           expiry_date=COALESCE(?,expiry_date),
           location=COALESCE(?,location),
           notes=COALESCE(?,notes),
           updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [data.quantity, data.unit, data.expiry_date, data.location, data.notes, id, userId]
    );
  }

  static async deleteItem(id, userId) {
    await db.query("DELETE FROM InventoryItems WHERE id=? AND user_id=?", [id, userId]);
  }
}
