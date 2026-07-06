import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { decryptValue } from "../util/env-encrypt.util.js";
dotenv.config();

const DB_PASSWORD = process.env.DB_PASSWORD_ENCRYPTED
  ? decryptValue(process.env.DB_PASSWORD_ENCRYPTED, process.env.DB_PASSWORD_SECRET)
  : decryptValue(process.env.DB_PASSWORD || "", process.env.DB_PASSWORD_SECRET);

export const db = mysql.createPool({
  host: process.env.DB_HOST     || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER     || "root",
  password: DB_PASSWORD,
  database: process.env.DB_NAME     || "smart_kitchen",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Siguri shtesë — parandalon query shumë të gjata
  connectTimeout: 10000,
});
