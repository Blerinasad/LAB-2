import { db } from "../config/db.js";

export class SettingsRepository {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM Settings ORDER BY `key` ASC");
    return rows;
  }

  static async updateByKey(key, value) {
    const [result] = await db.query(
      "UPDATE Settings SET value=?, updated_at=NOW() WHERE `key`=?",
      [value, key]
    );
    return result;
  }
}
