import { SettingsService } from "../services/settings.service.js";

export class SettingsController {
  static async getAll(req, res) {
    try {
      const data = await SettingsService.getAll();
      res.json({ success: true, data });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }

  static async getByKey(req, res) {
    try {
      const data = await SettingsService.getByKey(req.params.key);
      res.json({ success: true, data });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }

  static async updateByKey(req, res) {
    try {
      await SettingsService.updateByKey(req.params.key, req.body.value);
      res.json({ success: true, message: "Setting u përditësua" });
    } catch (e) { res.status(e.status || 500).json({ success: false, message: e.message }); }
  }
}
