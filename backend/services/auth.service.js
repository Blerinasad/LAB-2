import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../config/db.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../util/token.js";

const SALT = Number(process.env.SALT_ROUNDS || 12);

export class AuthService {

  static async login(email, password) {
    const [[user]] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             u.password_hash, u.is_active,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id = u.id
      LEFT JOIN Roles r ON r.id = ur.role_id
      WHERE u.email = ? GROUP BY u.id`, [email]);

    if (!user) throw { status: 401, message: "Email ose fjalëkalimi i gabuar" };
    if (!user.is_active) throw { status: 403, message: "Llogaria është joaktive" };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw { status: 401, message: "Email ose fjalëkalimi i gabuar" };

    const roles = user.roles ? user.roles.split(",") : ["User"];
    const payload = { id: user.id, email: user.email, roles, is_active: !!user.is_active };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query("INSERT INTO RefreshTokens (user_id, token_hash, expires_at) VALUES (?,?,?)",
      [user.id, hash, exp]);

    await db.query("INSERT INTO AuditLogs (user_id, action, entity, entity_id) VALUES (?,?,?,?)",
      [user.id, "LOGIN", "Users", user.id]).catch(() => {});

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles,
        is_active: !!user.is_active,
      },
    };
  }

  static async refresh(refreshToken) {
    let payload;
    try { payload = verifyRefreshToken(refreshToken); }
    catch { throw { status: 401, message: "Token i pavlefshëm" }; }

    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const [[stored]] = await db.query(
      "SELECT * FROM RefreshTokens WHERE user_id=? AND token_hash=? AND revoked_at IS NULL AND expires_at > NOW()",
      [payload.id, hash]);
    if (!stored) throw { status: 401, message: "Token i revokuar ose skaduar" };

    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE id=?", [stored.id]);

    const [[user]] = await db.query(`
      SELECT u.id, u.email, u.first_name, u.last_name,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id=u.id
      LEFT JOIN Roles r ON r.id=ur.role_id
      WHERE u.id=? AND u.is_active=1 GROUP BY u.id`, [payload.id]);
    if (!user) throw { status: 401, message: "User nuk ekziston ose joaktiv" };

    const roles = user.roles ? user.roles.split(",") : ["User"];
    const newAccess = generateAccessToken({ id: user.id, email: user.email, roles, is_active: true });
    const newRefresh = generateRefreshToken({ id: user.id, email: user.email, roles, is_active: true });

    const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query("INSERT INTO RefreshTokens (user_id,token_hash,expires_at) VALUES (?,?,?)",
      [user.id, newHash, exp]);

    return { accessToken: newAccess, refreshToken: newRefresh, user: { ...user, roles } };
  }

  static async logout(refreshToken) {
    if (!refreshToken) return;
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE token_hash=?", [hash]);
  }

  static async logoutAll(userId) {
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL", [userId]);
  }

  static async me(userId) {
    const [[user]] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
             GROUP_CONCAT(r.name ORDER BY r.id) AS roles
      FROM Users u
      LEFT JOIN UserRoles ur ON ur.user_id=u.id
      LEFT JOIN Roles r ON r.id=ur.role_id
      WHERE u.id=? GROUP BY u.id`, [userId]);
    if (!user) throw { status: 404, message: "User nuk u gjet" };
    return { ...user, roles: user.roles ? user.roles.split(",") : ["User"] };
  }

  static async forgotPassword(email) {
    const [[user]] = await db.query(
      "SELECT id, email FROM Users WHERE email=? AND is_active=1", [email]);
    if (!user) return; // Gjithmonë OK - mos zbulo nëse ekziston

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000);

    await db.query("DELETE FROM RefreshTokens WHERE user_id=? AND token_hash LIKE 'reset_%'", [user.id]).catch(()=>{});
    await db.query("INSERT INTO RefreshTokens (user_id,token_hash,expires_at) VALUES (?,?,?)",
      [user.id, `reset_${tokenHash}`, expiresAt]);

    return { userId: user.id, email: user.email, token };
  }

  static async resetPassword(token, uid, password) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const [[stored]] = await db.query(
      "SELECT * FROM RefreshTokens WHERE user_id=? AND token_hash=? AND revoked_at IS NULL AND expires_at > NOW()",
      [uid, `reset_${tokenHash}`]);
    if (!stored) throw { status: 400, message: "Link i pavlefshëm ose ka skaduar" };

    const hash = await bcrypt.hash(password, SALT);
    await db.query("UPDATE Users SET password_hash=?, updated_at=NOW() WHERE id=?", [hash, uid]);
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE id=?", [stored.id]);
    await db.query("UPDATE RefreshTokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL", [uid]);
  }
}
