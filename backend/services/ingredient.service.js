import { db } from "../config/db.js";

export class IngredientService {
  static async getAll({ search, category_id, page=1, limit=50 } = {}) {
    const where = ["1=1"]; const params = [];
    if (search) { where.push("i.name LIKE ?"); params.push(`%${search}%`); }
    if (category_id) { where.push("i.category_id=?"); params.push(category_id); }
    const offset = (Number(page)-1)*Number(limit);
    const [[{total}]] = await db.query(`SELECT COUNT(*) AS total FROM Ingredients i WHERE ${where.join(" AND ")}`, params);
    const [rows] = await db.query(
      `SELECT i.id,i.name,i.unit,i.calories_per_100,i.shelf_life_days,i.category_id,c.name AS category_name
       FROM Ingredients i JOIN Categories c ON c.id=i.category_id
       WHERE ${where.join(" AND ")} ORDER BY i.name LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]);
    return { items: rows, total };
  }

  static async getById(id) {
    const [[item]] = await db.query(
      `SELECT i.*,c.name AS category_name FROM Ingredients i JOIN Categories c ON c.id=i.category_id WHERE i.id=?`, [id]);
    if (!item) throw { status:404, message:"Ingredient nuk u gjet" };
    return item;
  }

  static async create({ name, unit, calories_per_100, shelf_life_days, category_id }) {
    if (!name?.trim() || !unit || !category_id)
      throw { status:400, message:"name, unit dhe category_id janë të detyrueshme" };
    const [[ex]] = await db.query("SELECT id FROM Ingredients WHERE name=?", [name.trim()]);
    if (ex) throw { status:409, message:"Ingredient me këtë emër ekziston" };
    const [r] = await db.query(
      "INSERT INTO Ingredients (name,unit,calories_per_100,shelf_life_days,category_id) VALUES (?,?,?,?,?)",
      [name.trim(), unit, calories_per_100||null, shelf_life_days||null, category_id]);
    return this.getById(r.insertId);
  }

  static async update(id, data) {
    await this.getById(id);
    const fields=[]; const params=[];
    ["name","unit","calories_per_100","shelf_life_days","category_id"].forEach(f => {
      if (data[f]!==undefined) { fields.push(`${f}=?`); params.push(data[f]); }
    });
    if (!fields.length) throw { status:400, message:"Asgjë për të përditësuar" };
    params.push(id);
    await db.query(`UPDATE Ingredients SET ${fields.join(",")} WHERE id=?`, params);
    return this.getById(id);
  }

  static async delete(id) {
    await this.getById(id);
    const [[used]] = await db.query("SELECT COUNT(*) AS c FROM InventoryItems WHERE ingredient_id=?", [id]);
    if (used.c > 0) throw { status:409, message:"Ingredient përdoret në inventar — nuk mund të fshihet" };
    await db.query("DELETE FROM Ingredients WHERE id=?", [id]);
  }
}
