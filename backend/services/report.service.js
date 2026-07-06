import { ReportRepository } from "../repositories/report.repository.js";

export class ReportService {
  static async getSummary(userId) {
    const { inventory, waste, topIngredients } = await ReportRepository.getSummaryParts(userId);
    return { inventory, waste, top_ingredients: topIngredients };
  }

  static async getWaste(userId, { from_date, to_date } = {}) {
    return ReportRepository.getWaste(userId, { from_date, to_date });
  }

  static async getConsumption(userId, { from_date, to_date } = {}) {
    return ReportRepository.getConsumption(userId, { from_date, to_date });
  }

  static async getAuditLogs({ limit=50, user_id, userId, action, from_date, to_date } = {}) {
    return ReportRepository.getAuditLogs({
      limit,
      user_id: user_id || userId,
      action,
      from_date,
      to_date,
    });
  }
}
