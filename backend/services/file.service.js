import { db } from "../config/db.js";

export class FileService {
  static async upload({ file, entity = "general", entity_id = 0, userId }) {
    if (!file) throw { status: 400, message: "Fajlli mungon" };

    const filePath = `memory://${Date.now()}-${file.originalname}`;
    const [result] = await db.query(
      `INSERT INTO Files (entity, entity_id, filename, file_path, file_size, mime_type, uploaded_by)
       VALUES (?,?,?,?,?,?,?)`,
      [entity, entity_id, file.originalname, filePath, file.size, file.mimetype, userId]
    );

    return {
      id: result.insertId,
      entity,
      entity_id,
      filename: file.originalname,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
    };
  }

  static async getById(id, userId) {
    const [[file]] = await db.query(
      "SELECT * FROM Files WHERE id=? AND uploaded_by=?",
      [id, userId]
    );
    if (!file) throw { status: 404, message: "Fajlli nuk u gjet" };
    return file;
  }

  static async delete(id, userId) {
    await FileService.getById(id, userId);
    await db.query("DELETE FROM Files WHERE id=?", [id]);
  }
}
