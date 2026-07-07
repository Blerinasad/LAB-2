import { db } from "../config/db.js";

export class SettingsService {

  static async getAll() {
    const [rows] = await db.query("SELECT * FROM Settings ORDER BY `key` ASC");
    return rows;
  }

  static async getByKey(key) {
    const [[row]] = await db.query("SELECT * FROM Settings WHERE `key`=?", [key]);
    if (!row) throw { status: 404, message: "Setting nuk u gjet" };
    return row;
  }

  static async updateByKey(key, value) {
    if (value === undefined) throw { status: 400, message: "value është i detyrueshëm" };
    const [r] = await db.query(
      "UPDATE Settings SET value=?, updated_at=NOW() WHERE `key`=?",
      [value, key]
    );
    if (r.affectedRows === 0) throw { status: 404, message: "Setting nuk u gjet" };
  }
}
