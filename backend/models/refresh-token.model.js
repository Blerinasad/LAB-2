import { db } from "../config/db.js";

export class RefreshTokenModel {
  // Ruaj token të ri — çdo herë që bëhet refresh, krijohet i ri
  static async create({ user_id, token_hash, expires_at }) {
    const [result] = await db.query(
      `INSERT INTO RefreshTokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user_id, token_hash, expires_at]
    );
    return result;
  }

  // Gjet token valid — jo i revokuar, jo i skaduar
  static async findValid(tokenHash) {
    const [rows] = await db.query(
      `SELECT * FROM RefreshTokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0];
  }

  // Revoko token të vetëm (pas rotation)
  static async revoke(tokenHash) {
    const [result] = await db.query(
      `UPDATE RefreshTokens SET revoked_at = NOW()
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [tokenHash]
    );
    return result;
  }

  // Revoko TË GJITHË tokenat e userit (logout nga të gjitha pajisjet)
  static async revokeAllByUser(userId) {
    const [result] = await db.query(
      `UPDATE RefreshTokens SET revoked_at = NOW()
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId]
    );
    return result;
  }

  // Pastro tokenat e skaduar (mund të thirret me cron)
  static async purgeExpired() {
    const [result] = await db.query(
      `DELETE FROM RefreshTokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
    );
    return result;
  }
}
