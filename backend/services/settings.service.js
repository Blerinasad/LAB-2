import { SettingsRepository } from "../repositories/settings.repository.js";

export class SettingsService {

  static async getAll() {
    return SettingsRepository.findAll();
  }

  static async updateByKey(key, value) {
    if (value === undefined) throw { status: 400, message: "value është i detyrueshëm" };
    const result = await SettingsRepository.updateByKey(key, value);
    if (result.affectedRows === 0) throw { status: 404, message: "Setting nuk u gjet" };
  }
}
