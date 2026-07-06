import { db } from "../config/db.js";

export class ShoppingListService {

  static async getAll(userId, { search, status, sort="created_at", order="desc" } = {}) {
    const where = ["sl.user_id=?"];
    const params = [userId];
    if (search) { where.push("sl.title LIKE ?"); params.push(`%${search}%`); }
    if (status) { where.push("sl.status=?"); params.push(status); }

    const safeSort = ["created_at","title","status"].includes(sort) ? sort : "created_at";
    const safeOrder = order === "asc" ? "ASC" : "DESC";

    const [rows] = await db.query(`
      SELECT sl.id, sl.title, sl.status, sl.created_at,
             COUNT(sli.id)                                  AS total_items,
             SUM(sli.is_purchased)                          AS purchased_items,
             SUM(sli.is_purchased=0)                        AS pending_items
      FROM ShoppingLists sl
      LEFT JOIN ShoppingListItems sli ON sli.shopping_list_id = sl.id
      WHERE ${where.join(" AND ")}
      GROUP BY sl.id
      ORDER BY sl.${safeSort} ${safeOrder}`, params);
    return rows;
  }

  static async getById(id, userId) {
    const [[list]] = await db.query(
      "SELECT * FROM ShoppingLists WHERE id=? AND user_id=?", [id, userId]);
    if (!list) throw { status: 404, message: "Lista nuk u gjet" };

    const [items] = await db.query(`
      SELECT sli.id, sli.quantity_needed, sli.unit, sli.is_purchased,
             i.id AS ingredient_id, i.name AS ingredient_name,
             c.name AS category_name
      FROM ShoppingListItems sli
      JOIN Ingredients i ON i.id = sli.ingredient_id
      JOIN Categories  c ON c.id = i.category_id
      WHERE sli.shopping_list_id=?
      ORDER BY sli.is_purchased ASC, i.name ASC`, [id]);

    return { ...list, items };
  }

  static async create(userId, title) {
    if (!title?.trim() || title.trim().length < 3)
      throw { status: 400, message: "Titulli duhet të ketë të paktën 3 karaktere" };
    const [r] = await db.query(
      "INSERT INTO ShoppingLists (user_id, title, status) VALUES (?,?,?)",
      [userId, title.trim(), "active"]);
    return this.getById(r.insertId, userId);
  }

  static async updateStatus(id, userId, status) {
    const allowed = ["active","completed","archived"];
    if (!allowed.includes(status)) throw { status: 400, message: "Status i pavlefshëm" };
    await this.getById(id, userId);
    await db.query("UPDATE ShoppingLists SET status=? WHERE id=? AND user_id=?", [status, id, userId]);
  }

  static async delete(id, userId) {
    await this.getById(id, userId);
    await db.query("DELETE FROM ShoppingListItems WHERE shopping_list_id=?", [id]);
    await db.query("DELETE FROM ShoppingLists WHERE id=? AND user_id=?", [id, userId]);
  }

  static async addItem(listId, userId, { ingredient_id, quantity_needed, unit }) {
    const list = await this.getById(listId, userId);
    if (list.status !== "active") throw { status: 400, message: "Lista nuk është aktive" };
    if (!ingredient_id || !quantity_needed || !unit?.trim())
      throw { status: 400, message: "ingredient_id, quantity_needed dhe unit janë të detyrueshme" };

    const [[ing]] = await db.query("SELECT id FROM Ingredients WHERE id=?", [ingredient_id]);
    if (!ing) throw { status: 404, message: "Ingredient nuk ekziston" };

    const [r] = await db.query(
      "INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit) VALUES (?,?,?,?)",
      [listId, ingredient_id, quantity_needed, unit.trim()]);
    return { id: r.insertId, ingredient_id, quantity_needed, unit: unit.trim(), is_purchased: 0 };
  }

  static async markPurchased(listId, itemId, userId) {
    await this.getById(listId, userId);
    const [[item]] = await db.query(
      "SELECT id, is_purchased FROM ShoppingListItems WHERE id=? AND shopping_list_id=?",
      [itemId, listId]);
    if (!item) throw { status: 404, message: "Artikulli nuk u gjet" };
    const next = item.is_purchased ? 0 : 1;
    await db.query("UPDATE ShoppingListItems SET is_purchased=? WHERE id=?", [next, itemId]);
    return { is_purchased: next };
  }

  static async deleteItem(listId, itemId, userId) {
    await this.getById(listId, userId);
    const [[item]] = await db.query(
      "SELECT id FROM ShoppingListItems WHERE id=? AND shopping_list_id=?", [itemId, listId]);
    if (!item) throw { status: 404, message: "Artikulli nuk u gjet" };
    await db.query("DELETE FROM ShoppingListItems WHERE id=?", [itemId]);
  }

  static async getSuggestions(userId, limit=8) {
    const [rows] = await db.query(`
      SELECT i.id AS ingredient_id, i.name AS ingredient_name, i.unit,
             COALESCE(ii.quantity, 0) AS current_quantity,
             COALESCE(DATEDIFF(ii.expiry_date, CURDATE()), 999) AS days_until_expiry
      FROM Ingredients i
      LEFT JOIN InventoryItems ii ON ii.ingredient_id=i.id AND ii.user_id=?
      WHERE (ii.quantity IS NULL OR ii.quantity < 0.5 OR DATEDIFF(ii.expiry_date, CURDATE()) <= 3)
      ORDER BY days_until_expiry ASC LIMIT ?`, [userId, Number(limit)]);
    return rows;
  }

  static async exportCSV(listId, userId) {
    const list = await this.getById(listId, userId);
    const header = "Ingredient,Sasia,Njësia,Blerë\n";
    const rows = list.items.map(i =>
      `"${i.ingredient_name}",${i.quantity_needed},${i.unit},${i.is_purchased ? "Po" : "Jo"}`
    ).join("\n");
    return header + rows;
  }
}
