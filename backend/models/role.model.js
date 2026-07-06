import { db } from "../config/db.js";

export class RoleModel {
  static async getAll() {
    const [rows] = await db.query(`SELECT id, name, description FROM Roles ORDER BY id ASC`);
    return rows;
  }
  static async findByName(name) {
    const [rows] = await db.query(`SELECT id, name FROM Roles WHERE name=? LIMIT 1`, [name]);
    return rows[0];
  }
}

export class UserRoleModel {
  static async getRolesByUserId(userId) {
    const [rows] = await db.query(
      `SELECT r.id, r.name FROM UserRoles ur
       INNER JOIN Roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? ORDER BY r.id ASC`,
      [userId]
    );
    return rows;
  }
  static async assignRole(userId, roleId) {
    const [result] = await db.query(
      `INSERT IGNORE INTO UserRoles (user_id, role_id) VALUES (?, ?)`,
      [userId, roleId]
    );
    return result;
  }
  static async deleteByUserId(userId) {
    const [result] = await db.query(`DELETE FROM UserRoles WHERE user_id=?`, [userId]);
    return result;
  }
}

export class PermissionModel {
  static async getByUserId(userId) {
    const [rows] = await db.query(
      `SELECT DISTINCT p.id, p.name FROM UserRoles ur
       INNER JOIN RolePermissions rp ON rp.role_id = ur.role_id
       INNER JOIN Permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ? ORDER BY p.id ASC`,
      [userId]
    );
    return rows;
  }
}
