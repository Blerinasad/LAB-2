import bcrypt from "bcrypt";
import { db } from "../config/db.js";
const SALT = Number(process.env.SALT_ROUNDS || 12);
const withRoles = (user) => ({ ...user, roles: user.roles ? user.roles.split(",") : ["User"] });

export class UserService {
  static async getAll({ search, role, is_active, page=1, limit=20 } = {}) {
    const where = ["1=1"]; const params = [];
    if (search) { where.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)"); params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    if (is_active !== undefined && is_active !== "") { where.push("u.is_active=?"); params.push(is_active); }
    const offset = (Number(page)-1)*Number(limit);
    const [[{total}]] = await db.query(`SELECT COUNT(DISTINCT u.id) AS total FROM Users u LEFT JOIN UserRoles ur ON ur.user_id=u.id LEFT JOIN Roles r ON r.id=ur.role_id WHERE ${where.join(" AND ")}${role ? " AND r.name=?" : ""}`, role ? [...params, role] : params);
    const [rows] = await db.query(`SELECT u.id,u.first_name,u.last_name,u.email,u.is_active,u.created_at, GROUP_CONCAT(r.name) AS roles FROM Users u LEFT JOIN UserRoles ur ON ur.user_id=u.id LEFT JOIN Roles r ON r.id=ur.role_id WHERE ${where.join(" AND ")}${role ? " AND r.name=?" : ""} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, role ? [...params, role, Number(limit), offset] : [...params, Number(limit), offset]);
    return { items: rows.map(withRoles), total };
  }

  static async getById(id) {
    const [[user]] = await db.query(`SELECT u.id,u.first_name,u.last_name,u.email,u.is_active,u.created_at, GROUP_CONCAT(r.name) AS roles FROM Users u LEFT JOIN UserRoles ur ON ur.user_id=u.id LEFT JOIN Roles r ON r.id=ur.role_id WHERE u.id=? GROUP BY u.id`, [id]);
    if (!user) throw { status: 404, message: "User nuk u gjet" };
    return withRoles(user);
  }

  static async create({ first_name, last_name, email, password, roles=["User"] }) {
    if (!email || !password) throw { status: 400, message: "Email dhe fjalëkalimi janë të detyrueshme" };
    const [[ex]] = await db.query("SELECT id FROM Users WHERE email=?", [email]);
    if (ex) throw { status: 409, message: "Email ekziston tashmë" };
    const hash = await bcrypt.hash(password, SALT);
    const [r] = await db.query("INSERT INTO Users (first_name,last_name,email,password_hash,is_active) VALUES (?,?,?,?,1)", [first_name,last_name,email,hash]);
    for (const roleName of roles) {
      const [[role]] = await db.query("SELECT id FROM Roles WHERE name=?", [roleName]);
      if (role) await db.query("INSERT INTO UserRoles (user_id,role_id) VALUES (?,?)", [r.insertId, role.id]);
    }
    return this.getById(r.insertId);
  }

  static async update(id, data) {
    await this.getById(id);
    const fields = []; const params = [];
    if (data.first_name) { fields.push("first_name=?"); params.push(data.first_name); }
    if (data.last_name) { fields.push("last_name=?"); params.push(data.last_name); }
    if (data.email) { fields.push("email=?"); params.push(data.email); }
    if (data.password) { fields.push("password_hash=?"); params.push(await bcrypt.hash(data.password, SALT)); }
    if (!fields.length) throw { status: 400, message: "Asgjë për të përditësuar" };
    params.push(id);
    await db.query(`UPDATE Users SET ${fields.join(",")}, updated_at=NOW() WHERE id=?`, params);
    return this.getById(id);
  }

  static async toggle(id) {
    const user = await this.getById(id);
    const next = user.is_active ? 0 : 1;
    await db.query("UPDATE Users SET is_active=? WHERE id=?", [next, id]);
    return { is_active: next };
  }

  static async delete(id) {
    await this.getById(id);
    await db.query("UPDATE Users SET is_active=0 WHERE id=?", [id]);
  }
}
