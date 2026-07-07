import { db } from "../config/db.js";

export class MealPlanService {

  static async getAll(userId, filters={}) {
    const { search, status, from_date, to_date, sort="week_start", order="desc" } = filters;
    const where = ["mp.user_id=?"];
    const params = [userId];
    if (search) { where.push("mp.title LIKE ?"); params.push(`%${search}%`); }
    if (status) { where.push("mp.status=?"); params.push(status); }
    if (from_date) { where.push("mp.week_start >= ?"); params.push(from_date); }
    if (to_date) { where.push("mp.week_end <= ?"); params.push(to_date); }

    const safeSort = ["week_start","title","status","created_at"].includes(sort) ? sort : "week_start";
    const safeOrder = order === "asc" ? "ASC" : "DESC";

    const [rows] = await db.query(`
      SELECT mp.id, mp.title, mp.week_start, mp.week_end, mp.status, mp.created_at,
             COUNT(mpd.id) AS total_meals
      FROM MealPlans mp
      LEFT JOIN MealPlanDays mpd ON mpd.meal_plan_id = mp.id
      WHERE ${where.join(" AND ")}
      GROUP BY mp.id ORDER BY mp.${safeSort} ${safeOrder}`, params);
    return rows;
  }

  static async getById(id, userId) {
    const [[plan]] = await db.query(
      "SELECT * FROM MealPlans WHERE id=? AND user_id=?", [id, userId]);
    if (!plan) throw { status: 404, message: "Plani nuk u gjet" };

    const [days] = await db.query(`
      SELECT mpd.id, mpd.day_of_week, mpd.meal_type,
             r.id AS recipe_id, r.title AS recipe_title,
             r.prep_time_min, r.cook_time_min, r.difficulty
      FROM MealPlanDays mpd
      JOIN Recipes r ON r.id = mpd.recipe_id
      WHERE mpd.meal_plan_id=?
      ORDER BY mpd.day_of_week, mpd.meal_type`, [id]);

    return { ...plan, days };
  }

  static async create(userId, data) {
    const { title, week_start, week_end, status } = data;
    if (!title?.trim() || !week_start || !week_end)
      throw { status: 400, message: "title, week_start dhe week_end janë të detyrueshme" };
    const [r] = await db.query(
      "INSERT INTO MealPlans (user_id,title,week_start,week_end,status) VALUES (?,?,?,?,?)",
      [userId, title.trim(), week_start, week_end, status||"draft"]);
    return this.getById(r.insertId, userId);
  }

  static async update(id, userId, data) {
    await this.getById(id, userId);
    const fields = []; const params = [];
    ["title","week_start","week_end","status"].forEach(f => {
      if (data[f] !== undefined) { fields.push(`${f}=?`); params.push(data[f]); }
    });
    if (!fields.length) throw { status: 400, message: "Asgjë për të përditësuar" };
    params.push(id, userId);
    await db.query(`UPDATE MealPlans SET ${fields.join(",")}, updated_at=NOW() WHERE id=? AND user_id=?`, params);
    return this.getById(id, userId);
  }

  static async delete(id, userId) {
    await this.getById(id, userId);
    await db.query("DELETE FROM MealPlanDays WHERE meal_plan_id=?", [id]);
    await db.query("DELETE FROM MealPlans WHERE id=? AND user_id=?", [id, userId]);
  }

  static async addDay(planId, userId, { recipe_id, day_of_week, meal_type }) {
    await this.getById(planId, userId);
    if (!recipe_id || !day_of_week || !meal_type)
      throw { status: 400, message: "recipe_id, day_of_week dhe meal_type janë të detyrueshme" };
    const [[rec]] = await db.query("SELECT id FROM Recipes WHERE id=?", [recipe_id]);
    if (!rec) throw { status: 404, message: "Receta nuk ekziston" };

    const [r] = await db.query(
      "INSERT INTO MealPlanDays (meal_plan_id,recipe_id,day_of_week,meal_type) VALUES (?,?,?,?)",
      [planId, recipe_id, day_of_week, meal_type]);
    return { id: r.insertId, recipe_id, day_of_week, meal_type };
  }

  static async removeDay(planId, dayId, userId) {
    await this.getById(planId, userId);
    const [[day]] = await db.query(
      "SELECT id FROM MealPlanDays WHERE id=? AND meal_plan_id=?", [dayId, planId]);
    if (!day) throw { status: 404, message: "Dita nuk u gjet" };
    await db.query("DELETE FROM MealPlanDays WHERE id=?", [dayId]);
  }

  static async generateShoppingList(planId, userId) {
    const plan = await this.getById(planId, userId);
    const [ingredients] = await db.query(`
      SELECT i.id AS ingredient_id, i.name, i.unit,
             SUM(ri.quantity) AS total_quantity,
             COALESCE(ii.quantity, 0) AS have_quantity
      FROM MealPlanDays mpd
      JOIN RecipeIngredients ri ON ri.recipe_id = mpd.recipe_id
      JOIN Ingredients i ON i.id = ri.ingredient_id
      LEFT JOIN InventoryItems ii ON ii.ingredient_id=i.id AND ii.user_id=?
      WHERE mpd.meal_plan_id=?
      GROUP BY i.id, i.name, i.unit, ii.quantity`, [userId, planId]);

    const missing = ingredients.filter(i => Number(i.total_quantity) > Number(i.have_quantity));
    if (!missing.length) return { message: "Ke të gjithë ingredientët", items_added: 0 };

    const title = `Lista nga "${plan.title}"`;
    const [r] = await db.query(
      "INSERT INTO ShoppingLists (user_id,title,status) VALUES (?,?,?)", [userId, title, "active"]);

    for (const ing of missing) {
      const need = Number(ing.total_quantity) - Number(ing.have_quantity);
      await db.query(
        "INSERT INTO ShoppingListItems (shopping_list_id,ingredient_id,quantity_needed,unit) VALUES (?,?,?,?)",
        [r.insertId, ing.ingredient_id, Math.ceil(need * 10) / 10, ing.unit]);
    }
    return { shopping_list_id: r.insertId, items_added: missing.length };
  }
}
