import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthRepository } from "../repositories/auth.repository.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../util/token.util.js";

const SALT = Number(process.env.SALT_ROUNDS || 12);

export class AuthService {

  static async login(email, password) {
    const user = await AuthRepository.findLoginUserByEmail(email);

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
    await AuthRepository.insertRefreshToken(user.id, hash, exp);
    await AuthRepository.writeLoginAudit(user.id);

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
    const stored = await AuthRepository.findValidRefreshToken(payload.id, hash);
    if (!stored) throw { status: 401, message: "Token i revokuar ose skaduar" };

    await AuthRepository.revokeRefreshTokenById(stored.id);

    const user = await AuthRepository.findActiveUserWithRoles(payload.id);
    if (!user) throw { status: 401, message: "User nuk ekziston ose joaktiv" };

    const roles = user.roles ? user.roles.split(",") : ["User"];
    const newAccess = generateAccessToken({ id: user.id, email: user.email, roles, is_active: true });
    const newRefresh = generateRefreshToken({ id: user.id, email: user.email, roles, is_active: true });

    const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await AuthRepository.insertRefreshToken(user.id, newHash, exp);

    return { accessToken: newAccess, refreshToken: newRefresh, user: { ...user, roles } };
  }

  static async logout(refreshToken) {
    if (!refreshToken) return;
    const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await AuthRepository.revokeRefreshTokenByHash(hash);
  }

  static async logoutAll(userId) {
    await AuthRepository.revokeAllRefreshTokens(userId);
  }

  static async me(userId) {
    const user = await AuthRepository.findMe(userId);
    if (!user) throw { status: 404, message: "User nuk u gjet" };
    return { ...user, roles: user.roles ? user.roles.split(",") : [] };
  }

  static async forgotPassword(email) {
    const user = await AuthRepository.findActiveUserByEmail(email);
    if (!user) return; // Gjithmonë OK - mos zbulo nëse ekziston

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000);

    await AuthRepository.deleteResetTokens(user.id);
    await AuthRepository.insertRefreshToken(user.id, `reset_${tokenHash}`, expiresAt);

    return { userId: user.id, email: user.email, token };
  }

  static async resetPassword(token, uid, password) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await AuthRepository.findValidRefreshToken(uid, `reset_${tokenHash}`);
    if (!stored) throw { status: 400, message: "Link i pavlefshëm ose ka skaduar" };

    const hash = await bcrypt.hash(password, SALT);
    await AuthRepository.updatePassword(uid, hash);
    await AuthRepository.revokeRefreshTokenById(stored.id);
    await AuthRepository.revokeAllRefreshTokens(uid);
  }
}
