import { db } from "../config/db.js";

export class CategoryService {

  static async getAll() {
    const [rows] = await db.query("SELECT * FROM Categories ORDER BY name");
    return rows;
  }

  static async getById(id) {
    const [[item]] = await db.query("SELECT * FROM Categories WHERE id=?", [id]);
    if (!item) throw { status:404, message:"Kategoria nuk u gjet" };
    return item;
  }

  static async create({ name, description, color_hex }) {
    if (!name?.trim()) throw { status:400, message:"name është i detyrueshëm" };
    const [[ex]] = await db.query("SELECT id FROM Categories WHERE name=?", [name.trim()]);
    if (ex) throw { status:409, message:"Kategoria me këtë emër ekziston" };
    const [r] = await db.query(
      "INSERT INTO Categories (name, description, color_hex) VALUES (?,?,?)",
      [name.trim(), description||null, color_hex||null]);
    return this.getById(r.insertId);
  }

  static async update(id, data) {
    await this.getById(id);
    const fields=[]; const params=[];
    ["name","description","color_hex"].forEach(f => {
      if (data[f]!==undefined) { fields.push(`${f}=?`); params.push(data[f]); }
    });
    if (!fields.length) throw { status:400, message:"Asgjë për të përditësuar" };
    params.push(id);
    await db.query(`UPDATE Categories SET ${fields.join(",")} WHERE id=?`, params);
    return this.getById(id);
  }

  static async delete(id) {
    await this.getById(id);
    const [[used]] = await db.query("SELECT COUNT(*) AS c FROM Ingredients WHERE category_id=?", [id]);
    if (used.c > 0) throw { status:409, message:"Kategoria përdoret nga ingredientë — nuk mund të fshihet" };
    await db.query("DELETE FROM Categories WHERE id=?", [id]);
  }
}
