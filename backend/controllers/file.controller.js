import { FileService } from "../services/file.service.js";

export class FileController {
  static async upload(req, res) {
    try {
      const { entity, entity_id } = req.body;
      const data = await FileService.save(req.file, req.user.id, entity || "General", Number(entity_id) || 0);
      res.status(201).json({ success: true, data });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }

  static async getById(req, res) {
    try {
      const data = await FileService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }

  static async remove(req, res) {
    try {
      const isAdmin = (req.user.roles || []).includes("Admin");
      const data = await FileService.remove(req.params.id, req.user.id, isAdmin);
      res.json({ success: true, data });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }
}
