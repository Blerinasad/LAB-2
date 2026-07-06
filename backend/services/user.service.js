import bcrypt from "bcrypt";
import { UsersRepository } from "../repositories/users.repository.js";
const SALT = Number(process.env.SALT_ROUNDS || 12);

export class UserService {
  static async getAll({ search, role, is_active, page=1, limit=20 } = {}) {
    const { rows, total } = await UsersRepository.findAll({ search, role, is_active, page, limit });
    return { items: rows.map(u => ({...u, roles: u.roles ? u.roles.split(",") : []})), total };
  }

  static async getById(id) {
    const user = await UsersRepository.findById(id);
    if (!user) throw { status: 404, message: "User nuk u gjet" };
    return { ...user, roles: user.roles ? user.roles.split(",") : [] };
  }

  static async create({ first_name, last_name, email, password, roles=["User"] }) {
    if (!email || !password) throw { status: 400, message: "Email dhe fjalëkalimi janë të detyrueshme" };
    const ex = await UsersRepository.findByEmail(email);
    if (ex) throw { status: 409, message: "Email ekziston tashmë" };
    const hash = await bcrypt.hash(password, SALT);
    const userId = await UsersRepository.createUser({ first_name, last_name, email, passwordHash: hash });
    for (const roleName of roles) {
      const role = await UsersRepository.findRoleByName(roleName);
      if (role) await UsersRepository.addRole(userId, role.id);
    }
    return this.getById(userId);
  }

  static async update(id, data) {
    await this.getById(id);
    const fields = []; const params = [];
    if (data.first_name) { fields.push("first_name=?"); params.push(data.first_name); }
    if (data.last_name) { fields.push("last_name=?");  params.push(data.last_name); }
    if (data.email) { fields.push("email=?");      params.push(data.email); }
    if (data.password) { fields.push("password_hash=?"); params.push(await bcrypt.hash(data.password, SALT)); }
    if (!fields.length) throw { status: 400, message: "Asgjë për të përditësuar" };
    await UsersRepository.updateUser(id, fields, params);
    return this.getById(id);
  }

  static async toggle(id) {
    const user = await this.getById(id);
    const next = user.is_active ? 0 : 1;
    await UsersRepository.setActive(id, next);
    return { is_active: next };
  }

  static async delete(id) {
    await this.getById(id);
    await UsersRepository.setActive(id, 0);
  }
}
