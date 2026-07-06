import { DashboardRepository } from "../repositories/dashboard.repository.js";

export class DashboardService {

  static async getSummary(userId, roles=[]) {
    const isAdmin = roles.includes("Admin");
    const parts = await DashboardRepository.getSummaryParts(userId, isAdmin);

    return {
      inventory: {
        total_items: Number(parts.inventory.total_items || 0),
        total_quantity: Number(parts.inventory.total_quantity || 0),
        expired: Number(parts.inventory.expired || 0),
        expiring_soon: Number(parts.inventory.expiring_soon || 0),
        expiring_week: Number(parts.inventory.expiring_week || 0),
        low_stock: Number(parts.inventory.low_stock || 0),
      },
      recipes: { total: Number(parts.recipes.total || 0) },
      meal_plans: { active: Number(parts.mealPlans.active || 0) },
      shopping: {
        active_lists: Number(parts.shopping.active_lists || 0),
        pending_items: Number(parts.shopping.pending_items || 0),
      },
      orders: { total: Number(parts.orders.total || 0), pending: Number(parts.orders.pending || 0) },
      waste: { total_kg: Number(parts.waste.total_kg || 0).toFixed(2) },
      notifications: { unread: Number(parts.notifications.unread || 0) },
      admin: parts.admin,
    };
  }

  static async getActivity(userId, limit=10) {
    return DashboardRepository.getActivity(userId, limit);
  }

  static async getCharts(userId) {
    return DashboardRepository.getCharts(userId);
  }
}
