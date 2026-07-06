import { FileService } from "../services/file.service.js";

export class FileController {
  static async upload(req, res) {
    try {
      const data = await FileService.upload({
        file: req.file,
        entity: req.body.entity,
        entity_id: req.body.entity_id,
        userId: req.user.id,
      });
      return res.status(201).json({ success: true, data });
    } catch (e) { return res.status(e.status || 500).json({ success:false, message:e.message }); }
  }

  static async getById(req, res) {
    try {
      const data = await FileService.getById(req.params.id, req.user.id);
      return res.json({ success: true, data });
    } catch (e) { return res.status(e.status || 500).json({ success:false, message:e.message }); }
  }

  static async delete(req, res) {
    try {
      await FileService.delete(req.params.id, req.user.id);
      return res.json({ success:true, message:"Fajlli u fshi" });
    } catch (e) { return res.status(e.status || 500).json({ success:false, message:e.message }); }
  }
}
