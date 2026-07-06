import { db } from "../config/db.js";

function buildUserWhere({ search, role, is_active } = {}) {
  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (is_active !== undefined && is_active !== "") {
    where.push("u.is_active=?");
    params.push(is_active);
  }
  if (role) {
    where.push("r.name=?");
    params.push(role);
  }
  return { where, params };
}

export class UsersRepository {
  static async findAll({ search, role, is_active, page = 1, limit = 20 } = {}) {
    const { where, params } = buildUserWhere({ search, role, is_active });
    const offset = (Number(page) - 1) * Number(limit);
    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT u.id) AS total
       FROM Users u
       LEFT JOIN UserRoles ur ON ur.user_id=u.id
       LEFT JOIN Roles r ON r.id=ur.role_id
       WHERE ${where.join(" AND ")}`,
      params
    );
    const [rows] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
              GROUP_CONCAT(r.name) AS roles
       FROM Users u
       LEFT JOIN UserRoles ur ON ur.user_id=u.id
       LEFT JOIN Roles r ON r.id=ur.role_id
       WHERE ${where.join(" AND ")}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    return { rows, total };
  }

  static async findById(id) {
    const [[user]] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
             GROUP_CONCAT(r.name) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id=u.id
      LEFT JOIN Roles r ON r.id=ur.role_id
      WHERE u.id=?
      GROUP BY u.id`, [id]);
    return user;
  }

  static async findByEmail(email) {
    const [[user]] = await db.query("SELECT id FROM Users WHERE email=?", [email]);
    return user;
  }

  static async createUser({ first_name, last_name, email, passwordHash }) {
    const [result] = await db.query(
      "INSERT INTO Users (first_name,last_name,email,password_hash,is_active) VALUES (?,?,?,?,1)",
      [first_name, last_name, email, passwordHash]
    );
    return result.insertId;
  }

  static async findRoleByName(name) {
    const [[role]] = await db.query("SELECT id FROM Roles WHERE name=?", [name]);
    return role;
  }

  static async addRole(userId, roleId) {
    await db.query("INSERT INTO UserRoles (user_id,role_id) VALUES (?,?)", [userId, roleId]);
  }

  static async updateUser(id, fields, params) {
    await db.query(`UPDATE Users SET ${fields.join(",")}, updated_at=NOW() WHERE id=?`, [...params, id]);
  }

  static async setActive(id, isActive) {
    await db.query("UPDATE Users SET is_active=? WHERE id=?", [isActive, id]);
  }
}
