// ============================================================
// util/env-encrypt.js
// Enkripto/dekripto variabla sensitive të .env me AES-256
//
// Ekzekuto: node util/env-encrypt.js encrypt "fjalëkalimi_yt"
// Output: ENC:iv:encryptedData → vendos në .env si DB_PASSWORD
//
// Për prodhim: vendos ENV_MASTER_KEY si environment variable
// (jo në .env) — ky është çelësi kryesor
// ============================================================

import crypto from "crypto";
import { pathToFileURL } from "url";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32; // 256 bits

// Master key vjen nga environment (jo nga .env)
// Vendos: set ENV_MASTER_KEY=your_secret_32_char_key (Windows)
// ose: export ENV_MASTER_KEY=your_secret_32_char_key (Linux/Mac)
function getMasterKey() {
  const provided = process.env.ENV_MASTER_KEY;
  const isProd = process.env.NODE_ENV === "production";

  if (!provided) {
    // Në prodhim, mos lejo çelës të pasigurt të parazgjedhur
    if (isProd) {
      throw new Error(
        "ENV_MASTER_KEY mungon. Për të përdorur DB_PASSWORD të enkriptuar (ENC:...) " +
        "në prodhim, duhet të vendosësh ENV_MASTER_KEY si variabël sistemi. " +
        "Shembull: export ENV_MASTER_KEY=your_secret_key"
      );
    }
    // Vetëm në zhvillim lejohet çelësi i parazgjedhur (me paralajmërim)
    console.warn("[env-encrypt] ⚠ ENV_MASTER_KEY mungon — po përdoret çelës zhvillimi. MOS e përdor në prodhim.");
    return crypto.scryptSync("SmartKitchen_Default_Key_Change!", "SmartKitchenSalt2025", KEY_LENGTH);
  }
  return crypto.scryptSync(provided, "SmartKitchenSalt2025", KEY_LENGTH);
}

export function encryptValue(plainText) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  return `ENC:${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptValue(encryptedText) {
  if (!encryptedText?.startsWith("ENC:")) return encryptedText;
  const [, ivHex, dataHex] = encryptedText.split(":");
  const key = getMasterKey();
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

// CLI: node util/env-encrypt.js encrypt "mypassword"
// node util/env-encrypt.js decrypt "ENC:iv:data"
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [,, action, value] = process.argv;
  if (!action || !value) {
    console.log("Përdorimi:");
    console.log("  node util/env-encrypt.js encrypt \"fjalëkalimi\"");
    console.log("  node util/env-encrypt.js decrypt \"ENC:iv:data\"");
    process.exit(1);
  }
  if (action === "encrypt") {
    console.log("\nVlera e enkriptuar:");
    console.log(encryptValue(value));
    console.log("\nVendose këtë si DB_PASSWORD=... në .env");
    console.log("Mos harro të vendosësh ENV_MASTER_KEY si variabël sistemi (jo në .env)!");
  } else if (action === "decrypt") {
    console.log("\nVlera origjinale:", decryptValue(value));
  }
}
