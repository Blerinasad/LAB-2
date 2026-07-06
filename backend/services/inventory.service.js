import { InventoryRepository } from "../repositories/inventory.repository.js";

export class InventoryService {

  static async getAll(userId, { search, category_id, location, expiring_days, page=1, limit=20, sort="expiry_date", order="asc" } = {}) {
    const { rows, total } = await InventoryRepository.findAll(userId, {
      search, category_id, location, expiring_days, page, limit, sort, order,
    });
    return { items: rows, total, page: Number(page), limit: Number(limit) };
  }

  static async getById(id, userId) {
    const item = await InventoryRepository.findById(id, userId);
    if (!item) throw { status: 404, message: "Artikulli nuk u gjet" };
    return item;
  }

  static async getExpiring(userId, days=3) {
    return InventoryRepository.findExpiring(userId, days);
  }

  static async create(userId, data) {
    const { ingredient_id, quantity, unit, purchase_date, expiry_date, location, notes } = data;
    if (!ingredient_id || !quantity || !expiry_date)
      throw { status: 400, message: "ingredient_id, quantity dhe expiry_date janë të detyrueshme" };
    if (isNaN(Number(quantity)) || Number(quantity) <= 0)
      throw { status: 400, message: "Sasia duhet të jetë një numër pozitiv" };
    if (isNaN(Date.parse(expiry_date)))
      throw { status: 400, message: "expiry_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };
    if (purchase_date && isNaN(Date.parse(purchase_date)))
      throw { status: 400, message: "purchase_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };

    const ing = await InventoryRepository.findIngredient(ingredient_id);
    if (!ing) throw { status: 404, message: "Ingredient nuk ekziston" };

    const id = await InventoryRepository.createItem(userId, data, ing.unit);
    return this.getById(id, userId);
  }

  static async update(id, userId, data) {
    await this.getById(id, userId);
    const { quantity, unit, expiry_date, location, notes } = data;
    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0))
      throw { status: 400, message: "Sasia duhet të jetë një numër pozitiv" };
    if (expiry_date !== undefined && isNaN(Date.parse(expiry_date)))
      throw { status: 400, message: "expiry_date nuk është datë e vlefshme (përdor formatin YYYY-MM-DD)" };
    await InventoryRepository.updateItem(id, userId, { quantity, unit, expiry_date, location, notes });
    return this.getById(id, userId);
  }

  static async delete(id, userId) {
    await this.getById(id, userId);
    await InventoryRepository.deleteItem(id, userId);
  }

  static async exportCSV(userId) {
    const { items } = await this.getAll(userId, { limit: 9999 });
    const header = "ID,Ingredient,Kategoria,Sasia,Njësia,Lokacioni,Blerë,Skadon,Ditë\n";
    const rows = items.map(i =>
      `${i.id},"${i.ingredient_name}","${i.category_name}",${i.quantity},${i.unit},${i.location},${i.purchase_date},${i.expiry_date},${i.days_until_expiry}`
    ).join("\n");
    return header + rows;
  }
}
