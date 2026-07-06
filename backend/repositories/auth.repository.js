import { db } from "../config/db.js";

export class AuthRepository {
  static async findLoginUserByEmail(email) {
    const [[user]] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             u.password_hash, u.is_active,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id = u.id
      LEFT JOIN Roles r ON r.id = ur.role_id
      WHERE u.email = ? GROUP BY u.id`, [email]);
    return user;
  }

  static async findActiveUserWithRoles(id) {
    const [[user]] = await db.query(`
      SELECT u.id, u.email, u.first_name, u.last_name,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id=u.id
      LEFT JOIN Roles r ON r.id=ur.role_id
      WHERE u.id=? AND u.is_active=1 GROUP BY u.id`, [id]);
    return user;
  }

  static async findMe(id) {
    const [[user]] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id=u.id
      LEFT JOIN Roles r ON r.id=ur.role_id
      WHERE u.id=? GROUP BY u.id`, [id]);
    return user;
  }

  static async findActiveUserByEmail(email) {
    const [[user]] = await db.query(
      "SELECT id, email FROM Users WHERE email=? AND is_active=1",
      [email]
    );
    return user;
  }

  static async insertRefreshToken(userId, tokenHash, expiresAt) {
    await db.query(
      "INSERT INTO RefreshTokens (user_id, token_hash, expires_at) VALUES (?,?,?)",
      [userId, tokenHash, expiresAt]
    );
  }

  static async findValidRefreshToken(userId, tokenHash) {
    const [[token]] = await db.query(
      "SELECT * FROM RefreshTokens WHERE user_id=? AND token_hash=? AND revoked_at IS NULL AND expires_at > NOW()",
      [userId, tokenHash]
    );
    return token;
  }

  static async revokeRefreshTokenById(id) {
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE id=?", [id]);
  }

  static async revokeRefreshTokenByHash(tokenHash) {
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE token_hash=?", [tokenHash]);
  }

  static async revokeAllRefreshTokens(userId) {
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL", [userId]);
  }

  static async deleteResetTokens(userId) {
    await db.query(
      "DELETE FROM RefreshTokens WHERE user_id=? AND token_hash LIKE 'reset_%'",
      [userId]
    ).catch(() => {});
  }

  static async updatePassword(userId, passwordHash) {
    await db.query(
      "UPDATE Users SET password_hash=?, updated_at=NOW() WHERE id=?",
      [passwordHash, userId]
    );
  }

  static async writeLoginAudit(userId) {
    await db.query(
      "INSERT INTO AuditLogs (user_id, action, entity, entity_id) VALUES (?,?,?,?)",
      [userId, "LOGIN", "Users", userId]
    ).catch(() => {});
  }
}
