import { db } from "../config/db.js";

export class UserModel {
  static async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, password_hash, is_active
       FROM Users WHERE email = ? LIMIT 1`,
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, is_active, created_at, updated_at
       FROM Users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0];
  }

  static async getAll() {
    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
              GROUP_CONCAT(r.name ORDER BY r.id) AS roles
       FROM Users u
       LEFT JOIN UserRoles ur ON ur.user_id = u.id
       LEFT JOIN Roles r ON r.id = ur.role_id
       GROUP BY u.id
       ORDER BY u.id DESC`
    );
    return rows.map((u) => ({ ...u, roles: u.roles ? u.roles.split(",") : [] }));
  }

  static async create(data) {
    const [result] = await db.query(
      `INSERT INTO Users (first_name, last_name, email, password_hash, is_active, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.first_name, data.last_name, data.email, data.password_hash,
       data.is_active ?? 1, data.created_by ?? null, data.updated_by ?? null]
    );
    return result;
  }

  static async update(id, data) {
    const [result] = await db.query(
      `UPDATE Users SET first_name=?, last_name=?, email=?, is_active=?, updated_by=?
       WHERE id=?`,
      [data.first_name, data.last_name, data.email, data.is_active ?? 1, data.updated_by ?? null, id]
    );
    return result;
  }

  static async delete(id) {
    const [result] = await db.query(`DELETE FROM Users WHERE id=?`, [id]);
    return result;
  }
}
