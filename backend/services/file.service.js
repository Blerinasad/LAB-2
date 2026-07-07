import { db } from "../config/db.js";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export class FileService {
  static async save(file, uploadedBy, entity = "General", entityId = 0) {
    if (!file) throw { status: 400, message: "Asnjë skedar i ngarkuar" };
    const safeName = `${Date.now()}_${file.originalname.replace(/[^\w.\-]/g, "_")}`;
    const diskPath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(diskPath, file.buffer);

    const [r] = await db.query(
      `INSERT INTO Files (entity, entity_id, filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?,?,?,?,?,?,?)`,
      [entity, entityId, file.originalname, `uploads/${safeName}`, file.size, file.mimetype, uploadedBy]
    );
    return this.getById(r.insertId);
  }

  static async getById(id) {
    const [[row]] = await db.query("SELECT * FROM Files WHERE id=?", [id]);
    if (!row) throw { status: 404, message: "Skedari nuk u gjet" };
    return row;
  }

  static async remove(id, requesterId, isAdmin) {
    const file = await this.getById(id);
    if (!isAdmin && file.uploaded_by !== requesterId) {
      throw { status: 403, message: "Nuk keni leje për këtë skedar" };
    }
    const abs = path.resolve(file.file_path);
    if (fs.existsSync(abs)) { try { fs.unlinkSync(abs); } catch { /* skedari mund të mungojë */ } }
    await db.query("DELETE FROM Files WHERE id=?", [id]);
    return { id };
  }
}
