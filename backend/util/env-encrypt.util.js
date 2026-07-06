// Enkripto/dekripto vlera sensitive të .env me AES-256.
// Përdor DB_PASSWORD_SECRET si çelës lokal për DB_PASSWORD_ENCRYPTED.

import crypto from "crypto";
import { pathToFileURL } from "url";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;  // 256 bits

function getMasterKey(secret = process.env.DB_PASSWORD_SECRET) {
  const key = secret || "SmartKitchen_Default_Key_Change!";
  return crypto.scryptSync(key, "SmartKitchenSalt2025", KEY_LENGTH);
}

export function encryptValue(plainText, secret) {
  const key = getMasterKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  return `ENC:${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptValue(encryptedText, secret) {
  if (!encryptedText?.startsWith("ENC:")) return encryptedText;
  const [, ivHex, dataHex] = encryptedText.split(":");
  const key = getMasterKey(secret);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

// Lexo .env dhe dekripto çdo vlerë ENC:...
export function getDecryptedEnv(key) {
  const val = process.env[key];
  if (!val) return val;
  return decryptValue(val);
}

// CLI: node util/env-encrypt.util.js encrypt "mypassword"
//      node util/env-encrypt.util.js decrypt "ENC:iv:data"
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [,, action, value] = process.argv;
  if (!action || !value) {
    console.log("Përdorimi:");
    console.log("  node util/env-encrypt.util.js encrypt \"fjalëkalimi\"");
    console.log("  node util/env-encrypt.util.js decrypt \"ENC:iv:data\"");
    process.exit(1);
  }
  if (action === "encrypt") {
    console.log("\nVlera e enkriptuar:");
    console.log(encryptValue(value));
    console.log("\nVendose këtë si DB_PASSWORD_ENCRYPTED=... në .env");
    console.log("Vendos DB_PASSWORD_SECRET si variabël sekrete dhe mos e publiko.");
  } else if (action === "decrypt") {
    console.log("\nVlera origjinale:", decryptValue(value));
  }
}
