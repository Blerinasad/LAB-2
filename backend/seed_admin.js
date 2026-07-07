import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { db } from "./config/db.js";

dotenv.config();

const ROUNDS = Number(process.env.SALT_ROUNDS || 12);
const adminEmail = process.env.ADMIN_EMAIL || "admin@smartkitchen.com";
const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";
const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
const lastName = process.env.ADMIN_LAST_NAME || "System";

async function ensureAdminRole() {
  const [roleRows] = await db.query(
    "SELECT id FROM Roles WHERE name = ? LIMIT 1",
    ["Admin"],
  );
  if (roleRows.length === 0) {
    const [result] = await db.query(
      "INSERT INTO Roles (name, description) VALUES (?, ?)",
      ["Admin", "Aksesi i plotë i sistemit"],
    );
    return result.insertId;
  }

  return roleRows[0].id;
}

async function findExistingAdmin() {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active
     FROM Users u
     INNER JOIN UserRoles ur ON ur.user_id = u.id
     INNER JOIN Roles r ON r.id = ur.role_id
     WHERE r.name = ?
     ORDER BY u.id ASC
     LIMIT 1`,
    ["Admin"],
  );

  return rows[0] || null;
}

async function main() {
  console.log("\nSmart Kitchen — Seed First Admin");

  const existingAdmin = await findExistingAdmin();
  if (existingAdmin) {
    console.log(
      `Admin ekziston tashmë: ${existingAdmin.email} (id ${existingAdmin.id})`,
    );
    process.exit(0);
  }

  const roleId = await ensureAdminRole();
  const passwordHash = await bcrypt.hash(adminPassword, ROUNDS);

  const [existingUserRows] = await db.query(
    "SELECT id FROM Users WHERE email = ? LIMIT 1",
    [adminEmail],
  );

  let userId;
  if (existingUserRows.length > 0) {
    userId = existingUserRows[0].id;
    await db.query(
      "UPDATE Users SET first_name = ?, last_name = ?, password_hash = ?, is_active = 1 WHERE id = ?",
      [firstName, lastName, passwordHash, userId],
    );
  } else {
    const [result] = await db.query(
      "INSERT INTO Users (first_name, last_name, email, password_hash, is_active) VALUES (?, ?, ?, ?, 1)",
      [firstName, lastName, adminEmail, passwordHash],
    );
    userId = result.insertId;
  }

  await db.query(
    "INSERT IGNORE INTO UserRoles (user_id, role_id) VALUES (?, ?)",
    [userId, roleId],
  );

  console.log(`Admin i ri u krijua me sukses:`);
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Role ID: ${roleId}`);
}

main().catch((error) => {
  console.error("Gabim gjatë krijimit të admin-it:", error.message);
  process.exit(1);
});
