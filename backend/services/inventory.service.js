import { db } from "../config/db.js";

function normalizeUnit(unit) {
  const normalized = unit === "cope" ? "piece" : unit;
  return ["piece","g","kg","ml","l","pack","box","bottle","can","slice"].includes(normalized) ? normalized : "piece";
}

export class InventoryService {

  static async getAll(userId, { search, category_id, location, expiring_days, page=1, limit=20, sort="expiry_date", order="asc" } = {}) {
    const offset = (Number(page)-1) * Number(limit);
    const where = ["ii.user_id = ?"];
    const params = [userId];

    if (search) { where.push("(i.name LIKE ? OR c.name LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    if (category_id) { where.push("i.category_id = ?"); params.push(category_id); }
    if (location) { where.push("ii.location = ?"); params.push(location); }
    if (expiring_days) { where.push("DATEDIFF(ii.expiry_date, CURDATE()) <= ? AND ii.expiry_date >= CURDATE()"); params.push(expiring_days); }

    const allowed = ["expiry_date","ingredient_name","quantity","purchase_date","location"];
    const safeSort = allowed.includes(sort) ? sort : "expiry_date";
    const safeOrder = order === "desc" ? "DESC" : "ASC";

    const sql = `
      SELECT ii.id, ii.quantity, ii.unit, ii.location, ii.purchase_date, ii.expiry_date,
             ii.notes, i.id AS ingredient_id, i.name AS ingredient_name,
             c.name AS category_name,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id = ii.ingredient_id
      JOIN Categories c ON c.id = i.category_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${safeSort === "ingredient_name" ? "i.name" : "ii."+safeSort} ${safeOrder}
      LIMIT ? OFFSET ?`;

    const [[{total}]] = await db.query(
      `SELECT COUNT(*) AS total FROM InventoryItems ii JOIN Ingredients i ON i.id=ii.ingredient_id JOIN Categories c ON c.id=i.category_id WHERE ${where.join(" AND ")}`,
      params);
    const [rows] = await db.query(sql, [...params, Number(limit), offset]);
    return { items: rows, total, page: Number(page), limit: Number(limit) };
  }

  static async getById(id, userId) {
    const [[item]] = await db.query(`
      SELECT ii.*, i.name AS ingredient_name, c.name AS category_name,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id = ii.ingredient_id
      JOIN Categories c ON c.id = i.category_id
      WHERE ii.id=? AND ii.user_id=?`, [id, userId]);
    if (!item) throw { status: 404, message: "Artikulli nuk u gjet" };
    return item;
  }

  static async getExpiring(userId, days=3) {
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

  static async create(userId, data) {
    const { ingredient_id, quantity, unit, purchase_date, expiry_date, location, notes } = data;
    if (!ingredient_id || !quantity || !expiry_date)
      throw { status: 400, message: "ingredient_id, quantity dhe expiry_date janë të detyrueshme" };
    if (isNaN(Number(quantity)) || Number(quantity) <= 0)
      throw { status: 400, message: "Sasia duhet të jetë një numër pozitiv" };
    if (isNaN(Date.parse(expiry_date)))
      throw { status: 400, message: "expiry_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };
    if (purchase_date && isNaN(Date.parse(purchase_date)))
      throw { status: 400, message: "purchase_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };

    const [[ing]] = await db.query("SELECT id, unit FROM Ingredients WHERE id=?", [ingredient_id]);
    if (!ing) throw { status: 404, message: "Ingredient nuk ekziston" };

    const [result] = await db.query(
      `INSERT INTO InventoryItems (user_id, ingredient_id, quantity, unit, purchase_date, expiry_date, location, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userId, ingredient_id, quantity, normalizeUnit(unit || ing.unit),
       purchase_date || new Date().toISOString().slice(0,10),
       expiry_date, location || "Fridge", notes || null]);

    return this.getById(result.insertId, userId);
  }

  static async update(id, userId, data) {
    await this.getById(id, userId);
    const { quantity, unit, expiry_date, location, notes } = data;
    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0))
      throw { status: 400, message: "Sasia duhet të jetë një numër pozitiv" };
    if (expiry_date !== undefined && isNaN(Date.parse(expiry_date)))
      throw { status: 400, message: "expiry_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };
    await db.query(
      "UPDATE InventoryItems SET quantity=COALESCE(?,quantity), unit=COALESCE(?,unit), expiry_date=COALESCE(?,expiry_date), location=COALESCE(?,location), notes=COALESCE(?,notes), updated_at=NOW() WHERE id=? AND user_id=?",
      [quantity, unit !== undefined ? normalizeUnit(unit) : undefined, expiry_date, location, notes, id, userId]);
    return this.getById(id, userId);
  }

  static async delete(id, userId) {
    await this.getById(id, userId);
    await db.query("DELETE FROM InventoryItems WHERE id=? AND user_id=?", [id, userId]);
  }

  static async exportCSV(userId) {
    const { items } = await this.getAll(userId, { limit: 9999 });
    const header = "ID,Ingredient,Kategoria,Sasia,Njësia,Lokacioni,Blerë,Skadon,Ditë\n";
    const rows = items.map(i =>
      `${i.id},"${i.ingredient_name}","${i.category_name}",${i.quantity},${i.unit},${i.location},${i.purchase_date},${i.expiry_date},${i.days_until_expiry}`
    ).join("\n");
    return header + rows;
  }
}
