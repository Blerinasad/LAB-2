// ============================================================
// seed.js — Ekzekuto: node seed.js
// Gjeneron hash LIVE me bcrypt dhe i fut në DB
// Tabelat duhet të jenë krijuar nga database/01_schema.sql
// ============================================================
import bcrypt from "bcrypt";
import { db } from "./config/db.js";
import dotenv from "dotenv";
dotenv.config();

const ROUNDS = Number(process.env.SALT_ROUNDS || 12);

async function run() {
  console.log("\nSmart Kitchen — Seed Users\n");
  const hAll = await bcrypt.hash("Password123!", ROUNDS);
  console.log("Hashët u gjeneruan.");

  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  await db.query("DELETE FROM UserRoles");
  await db.query("DELETE FROM RefreshTokens");
  await db.query("UPDATE Users SET password_hash=? WHERE id IN (1,2,3,4,5,6)", [hAll]);
  await db.query("SET FOREIGN_KEY_CHECKS = 1");

  // Kontroll
  const [rows] = await db.query(`
    SELECT u.id, u.email, GROUP_CONCAT(r.name ORDER BY r.id) AS roles
    FROM Users u
    LEFT JOIN UserRoles ur ON ur.user_id = u.id
    LEFT JOIN Roles r ON r.id = ur.role_id
    GROUP BY u.id ORDER BY u.id
  `);

  // Rirregjistrimi i UserRoles nëse janë fshirë
  const roleMap = [[1,1],[2,2],[3,3],[4,3],[5,3],[6,4]];
  for (const [uid, rid] of roleMap) {
    await db.query(
      "INSERT IGNORE INTO UserRoles (user_id, role_id) VALUES (?, ?)",
      [uid, rid]
    );
  }

  // Verifiko pas INSERT
  const [final] = await db.query(`
    SELECT u.id, u.email, u.is_active, GROUP_CONCAT(r.name ORDER BY r.id) AS roles
    FROM Users u
    LEFT JOIN UserRoles ur ON ur.user_id = u.id
    LEFT JOIN Roles r ON r.id = ur.role_id
    GROUP BY u.id ORDER BY u.id
  `);

  console.log("\nAccounts të gatshme:");
  final.forEach(r =>
    console.log(`  [${r.id}] ${r.email.padEnd(35)} → ${(r.roles||"–").padEnd(15)} aktiv:${r.is_active}`)
  );

  console.log(`
Login (të gjitha me të njëjtin fjalëkalim: Password123!):
  admin@smartkitchen.com / Password123! (Admin)
  artan@smartkitchen.com / Password123! (Manager)
  blerta@smartkitchen.com / Password123! (User)
  driton@smartkitchen.com / Password123! (User)
  fjolla@smartkitchen.com / Password123! (User)
  courier@smartkitchen.com / Password123! (Courier)
`);
  process.exit(0);
}

run().catch(e => { console.error("Gabim:", e.message); process.exit(1); });
