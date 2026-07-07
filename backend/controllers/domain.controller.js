import {
  IngredientModel, InventoryModel, RecipeModel,
  MealPlanModel, ShoppingListModel, ReportModel,
  NotificationModel, AuditLogModel, CategoryModel, MarketplaceModel
} from "../models/domain.model.js";
import { UserModel } from "../models/user.model.js";
import { UserRoleModel, RoleModel } from "../models/role.model.js";
import { hashPassword } from "../util/password.util.js";
import { MLRecommendation } from "../models/mongo/ml-recommendation.model.js";
import { io } from "../index.js";
import axios from "axios";

// ─── Helpers ───────────────────────────────────────────────
const ok = (res, data, msg = "Success", code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
const err = (res, msg = "Server error", code = 500, error = null) =>
  res.status(code).json({ success: false, message: msg, ...(error && { error }) });

const cleanText = (value) => String(value ?? "").trim();
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
const isFutureDate = (value) => isIsoDate(value) && new Date(`${value}T00:00:00`) > new Date(new Date().toDateString());
const isAllowed = (value, allowed) => allowed.includes(String(value ?? ""));
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const validateDateRange = (from, to, { allowSameDay = true, allowPastPurchase = true } = {}) => {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Datat duhet të jenë në formatin YYYY-MM-DD";
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (allowSameDay ? start > end : start >= end) return "Data e blerjes duhet të jetë para datës së skadimit";
  if (!allowPastPurchase && start < new Date(new Date().toDateString())) return "Data e blerjes nuk mund të jetë në të kaluarën";
  return null;
};

const validateOptionalDateRange = (from, to) => {
  if (from && !isIsoDate(from)) return "from_date duhet të jetë YYYY-MM-DD";
  if (to && !isIsoDate(to)) return "to_date duhet të jetë YYYY-MM-DD";
  if (from && to && new Date(`${from}T00:00:00`) > new Date(`${to}T00:00:00`)) return "from_date nuk mund të jetë pas to_date";
  return null;
};

const createNotificationAndEmit = async (userId, type, title, message, eventName, payload = {}) => {
  const result = await NotificationModel.create({ user_id: userId, type, title, message });
  io?.to(`user_${userId}`).emit(eventName, {
    id: result.insertId, type, title, message, is_read: 0, created_at: new Date().toISOString(), ...payload,
  });
  return result;
};

const hasRole = (req, role) => Array.isArray(req.user?.roles) && req.user.roles.includes(role);
const isAdmin = (req) => hasRole(req, "Admin");
const isManager = (req) => hasRole(req, "Manager");
const isCourier = (req) => hasRole(req, "Courier");
const isManagerOrAdmin = (req) => isAdmin(req) || isManager(req);
const isOrderStaff = (req) => isManagerOrAdmin(req) || isCourier(req);

const ORDER_STATUS_LABELS = {
  pending: "Në pritje",
  accepted: "U pranua",
  rejected: "U refuzua",
  preparing: "Në përgatitje",
  out_for_delivery: "U nis për dorëzim",
  delivered: "U dorëzua",
  cancelled: "U anulua",
};

const VALID_ORDER_TRANSITIONS = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  rejected: [],
  delivered: [],
  cancelled: [],
};

// ─── USER CONTROLLER ───────────────────────────────────────
export class UserController {
  static async getAll(req, res) {
    try { ok(res, await UserModel.getAll(), "Users fetched"); }
    catch (e) { err(res, "Failed to fetch users", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const { first_name, last_name, email, password, is_active = 1, roles = ["User"] } = req.body;
      if (!first_name || !last_name || !email || !password)
        return err(res, "first_name, last_name, email, password required", 400);
      if (await UserModel.findByEmail(email))
        return err(res, "Email already in use", 409);
      const result = await UserModel.create({
        first_name, last_name, email,
        password_hash: await hashPassword(password),
        is_active, created_by: req.user.id, updated_by: req.user.id,
      });
      const userId = result.insertId;
      for (const roleName of roles) {
        const role = await RoleModel.findByName(roleName);
        if (role) await UserRoleModel.assignRole(userId, role.id);
      }
      ok(res, { id: userId }, "User created", 201);
    } catch (e) { err(res, "Failed to create user", 500, e.message); }
  }
  static async update(req, res) {
    try {
      const { first_name, last_name, email, is_active = 1, roles = [] } = req.body;
      const result = await UserModel.update(req.params.id, {
        first_name, last_name, email, is_active, updated_by: req.user.id,
      });
      if (!result.affectedRows) return err(res, "User not found", 404);
      if (roles.length) {
        await UserRoleModel.deleteByUserId(req.params.id);
        for (const roleName of roles) {
          const role = await RoleModel.findByName(roleName);
          if (role) await UserRoleModel.assignRole(req.params.id, role.id);
        }
      }
      ok(res, null, "User updated");
    } catch (e) { err(res, "Failed to update user", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await UserModel.delete(req.params.id);
      if (!result.affectedRows) return err(res, "User not found", 404);
      ok(res, null, "User deleted");
    } catch (e) { err(res, "Failed to delete user", 500, e.message); }
  }
}

// ─── CATEGORY CONTROLLER ───────────────────────────────────
export class CategoryController {
  static async getAll(req, res) {
    try { ok(res, await CategoryModel.getAll(), "Categories fetched"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
}

// ─── INGREDIENT CONTROLLER ─────────────────────────────────
export class IngredientController {
  static async getAll(req, res) {
    try {
      const { search, category_id } = req.query;
      ok(res, await IngredientModel.getAll({ search, category_id }), "Ingredients fetched");
    } catch (e) { err(res, "Failed to fetch ingredients", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const item = await IngredientModel.findById(req.params.id);
      if (!item) return err(res, "Ingredient not found", 404);
      ok(res, item, "Ingredient fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const { category_id, name, unit, calories_per_100, shelf_life_days } = req.body;
      if (!category_id || !name || !unit)
        return err(res, "category_id, name, unit required", 400);
      const result = await IngredientModel.create({ category_id, name, unit, calories_per_100, shelf_life_days, created_by: req.user.id });
      ok(res, { id: result.insertId }, "Ingredient created", 201);
    } catch (e) { err(res, "Failed to create ingredient", 500, e.message); }
  }
  static async update(req, res) {
    try {
      const result = await IngredientModel.update(req.params.id, { ...req.body, updated_by: req.user.id });
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Ingredient updated");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await IngredientModel.delete(req.params.id);
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Ingredient deleted");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
}

// ─── INVENTORY CONTROLLER ──────────────────────────────────
export class InventoryController {
  static async getAll(req, res) {
    try {
      const isAdmin = req.user.roles?.includes("Admin");
      const filters = {
        ...req.query,
        user_id: isAdmin ? undefined : req.user.id,
      };
      const result = await InventoryModel.getAll(filters);
      ok(res, result, "Inventory fetched");
    } catch (e) { err(res, "Failed to fetch inventory", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const item = await InventoryModel.findById(req.params.id, req.user.id);
      if (!item) return err(res, "Item not found", 404);
      ok(res, item, "Item fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const { ingredient_id, quantity, purchase_date, expiry_date, location, notes } = req.body;
      if (!ingredient_id || !quantity || !purchase_date || !expiry_date)
        return err(res, "ingredient_id, quantity, purchase_date, expiry_date required", 400);
      if (!isPositiveInteger(ingredient_id)) return err(res, "ingredient_id must be a valid positive integer", 400);
      if (!isPositiveNumber(quantity)) return err(res, "quantity must be greater than 0", 400);
      const dateError = validateDateRange(purchase_date, expiry_date);
      if (dateError) return err(res, dateError, 400);
      if (!isFutureDate(expiry_date)) return err(res, "Data e skadimit duhet të jetë në të ardhmen", 400);
      const ingredient = await IngredientModel.findById(ingredient_id);
      if (!ingredient) return err(res, "Ingredient not found", 404);

      const result = await InventoryModel.create({
        user_id: req.user.id, ingredient_id: Number(ingredient_id), quantity: Number(quantity), purchase_date, expiry_date, location: cleanText(location) || null, notes: cleanText(notes) || null,
      });
      const item = await InventoryModel.findById(result.insertId, req.user.id);

      // WebSocket — inventory updated live
      io?.to(`user_${req.user.id}`).emit("inventory:updated", { action: "created", item });

      // Check expiry alert
      const daysLeft = item?.days_until_expiry ?? 999;
      if (daysLeft <= 3) {
        await NotificationModel.create({
          user_id: req.user.id, type: "expiry_alert",
          title: `${item.ingredient_name} po skadon!`,
          message: `Skadon pas ${daysLeft} ditë. Planifiko ta gatuash!`,
        });
        io?.to(`user_${req.user.id}`).emit("expiry:alert", {
          ingredient: item.ingredient_name, daysLeft, itemId: result.insertId,
        });
      }

      await AuditLogModel.create({ user_id: req.user.id, action: "CREATE", entity: "InventoryItems", entity_id: result.insertId, new_value: { ingredient_id, quantity }, ip_address: req.ip });
      ok(res, { id: result.insertId }, "Item added to inventory", 201);
    } catch (e) { err(res, "Failed to create inventory item", 500, e.message); }
  }
  static async update(req, res) {
    try {
      const existing = await InventoryModel.findById(req.params.id, req.user.id);
      if (!existing) return err(res, "Item not found", 404);
      const { ingredient_id, quantity, purchase_date, expiry_date, location, notes } = req.body;
      if (!isPositiveInteger(ingredient_id)) return err(res, "ingredient_id must be a valid positive integer", 400);
      if (!isPositiveNumber(quantity)) return err(res, "quantity must be greater than 0", 400);
      const dateError = validateDateRange(purchase_date, expiry_date);
      if (dateError) return err(res, dateError, 400);
      if (!isFutureDate(expiry_date)) return err(res, "Data e skadimit duhet të jetë në të ardhmen", 400);
      const ingredient = await IngredientModel.findById(ingredient_id);
      if (!ingredient) return err(res, "Ingredient not found", 404);
      const result = await InventoryModel.update(req.params.id, req.user.id, { ingredient_id: Number(ingredient_id), quantity: Number(quantity), purchase_date, expiry_date, location: cleanText(location) || null, notes: cleanText(notes) || null });
      if (!result.affectedRows) return err(res, "Update failed", 500);
      io?.to(`user_${req.user.id}`).emit("inventory:updated", { action: "updated", itemId: req.params.id });
      await AuditLogModel.create({ user_id: req.user.id, action: "UPDATE", entity: "InventoryItems", entity_id: req.params.id, old_value: existing, new_value: req.body, ip_address: req.ip });
      ok(res, null, "Item updated");
    } catch (e) { err(res, "Failed to update", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await InventoryModel.delete(req.params.id, req.user.id);
      if (!result.affectedRows) return err(res, "Item not found", 404);
      io?.to(`user_${req.user.id}`).emit("inventory:updated", { action: "deleted", itemId: req.params.id });
      ok(res, null, "Item deleted");
    } catch (e) { err(res, "Failed to delete", 500, e.message); }
  }
  static async getExpiring(req, res) {
    try {
      const days = Number(req.query.days) || 3;
      ok(res, await InventoryModel.getExpiringItems(req.user.id, days), "Expiring items fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async exportInventory(req, res) {
    try {
      const filters = { user_id: req.user.id, limit: 10000 };
      const { items } = await InventoryModel.getAll(filters);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="inventory_export.csv"');
      const csv = [
        "IngredientId,IngredientName,Sasia,Njesia,DataBlerjes,DataSkadimit,Lokacioni,Shenime",
        ...items.map(i => `${i.ingredient_id},"${i.ingredient_name.replace(/"/g, '""')}",${i.quantity},"${i.unit}",${i.purchase_date},${i.expiry_date},"${(i.location ?? "").replace(/"/g, '""')}","${(i.notes ?? "").replace(/"/g, '""')}"`)
      ].join("\r\n");
      return res.status(200).send(csv);
    } catch (e) { err(res, "Failed to export inventory", 500, e.message); }
  }
  static async importInventory(req, res) {
    try {
      if (!req.file) return err(res, "Please upload a CSV file", 400);
      const csvData = req.file.buffer.toString("utf8");
      const lines = csvData.split(/\r?\n/);
      if (lines.length <= 1) return err(res, "Empty or invalid CSV file", 400);
      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const values = matches.map(v => v.replace(/^"|"$/g, "").trim());
        if (values.length < 3) continue;
        const ingredient_id = Number(values[0]);
        const quantity = parseFloat(values[2]);
        const purchase_date = values[4] || new Date().toISOString().split("T")[0];
        const expiry_date = values[5] || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0];
        const location = values[6] || "Pantry";
        const notes = values[7] || "";
        if (isNaN(ingredient_id) || isNaN(quantity)) continue;
        await InventoryModel.create({
          user_id: req.user.id,
          ingredient_id,
          quantity,
          purchase_date,
          expiry_date,
          location,
          notes
        });
        importedCount++;
      }
      io?.to(`user_${req.user.id}`).emit("inventory:updated", { action: "imported", count: importedCount });
      ok(res, { imported_count: importedCount }, "Inventory items imported successfully");
    } catch (e) { err(res, "Failed to import inventory", 500, e.message); }
  }
}

// ─── RECIPE CONTROLLER ─────────────────────────────────────
export class RecipeController {
  static async getAll(req, res) {
    try { ok(res, await RecipeModel.getAll(req.query), "Recipes fetched"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const r = await RecipeModel.findById(req.params.id);
      if (!r) return err(res, "Recipe not found", 404);
      ok(res, r, "Recipe fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const { title, description, instructions, prep_time_min, cook_time_min, servings, difficulty = "medium", is_public, ingredients = [] } = req.body;
      if (!cleanText(title) || !cleanText(instructions)) return err(res, "title and instructions required", 400);
      if (!isAllowed(difficulty, ["easy", "medium", "hard"])) return err(res, "difficulty must be easy, medium, or hard", 400);
      if (servings && !isPositiveInteger(servings)) return err(res, "servings must be a positive integer", 400);
      if (prep_time_min && !isPositiveInteger(prep_time_min)) return err(res, "prep_time_min must be a positive integer", 400);
      if (cook_time_min && !isPositiveInteger(cook_time_min)) return err(res, "cook_time_min must be a positive integer", 400);
      if (!Array.isArray(ingredients) || ingredients.length === 0) return err(res, "Recipe must include at least one ingredient", 400);
      for (const ing of ingredients) {
        if (!isPositiveInteger(ing.ingredient_id) || !isPositiveNumber(ing.quantity)) return err(res, "Each recipe ingredient needs valid ingredient_id and quantity", 400);
      }
      const result = await RecipeModel.create({ title: cleanText(title), description: cleanText(description) || null, instructions: cleanText(instructions), prep_time_min, cook_time_min, servings, difficulty, is_public, created_by: req.user.id });
      for (const ing of ingredients) {
        await RecipeModel.addIngredient(result.insertId, { ...ing, ingredient_id: Number(ing.ingredient_id), quantity: Number(ing.quantity), unit: cleanText(ing.unit) || "unit", created_by: req.user.id });
      }
      ok(res, { id: result.insertId }, "Recipe created", 201);
    } catch (e) { err(res, "Failed to create recipe", 500, e.message); }
  }
  static async update(req, res) {
    try {
      const result = await RecipeModel.update(req.params.id, { ...req.body, updated_by: req.user.id });
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Recipe updated");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await RecipeModel.delete(req.params.id);
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Recipe deleted");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async exportRecipes(req, res) {
    try {
      const filters = { limit: 10000 };
      const { items } = await RecipeModel.getAll(filters);
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", 'attachment; filename="recipes_export.json"');
      return res.status(200).send(JSON.stringify(items, null, 2));
    } catch (e) { err(res, "Failed to export recipes", 500, e.message); }
  }
}

// ─── MEAL PLAN CONTROLLER ──────────────────────────────────
export class MealPlanController {
  static async getAll(req, res) {
    try {
      const { search, status, week_start, from_date, to_date, sort, order } = req.query;
      const dateError = validateOptionalDateRange(from_date, to_date) || (week_start && !isIsoDate(week_start) ? "week_start duhet të jetë YYYY-MM-DD" : null);
      if (dateError) return err(res, dateError, 400);
      if (status && !isAllowed(status, ["draft", "active", "completed"])) return err(res, "status i pavlefshëm", 400);
      ok(res, await MealPlanModel.getByUserId(req.user.id, { search, status, week_start, from_date, to_date, sort, order }), "Meal plans fetched");
    }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const plan = await MealPlanModel.getByIdAndUser(req.params.id, req.user.id);
      if (!plan) return err(res, "Meal plan not found", 404);
      ok(res, plan, "Meal plan fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const { title, week_start, week_end, status = "draft" } = req.body;
      if (!cleanText(title) || !week_start || !week_end) return err(res, "title, week_start, week_end required", 400);
      const dateError = validateDateRange(week_start, week_end);
      if (dateError) return err(res, dateError, 400);
      if (!isAllowed(status, ["draft", "active", "completed"])) return err(res, "status must be draft, active, or completed", 400);
      const result = await MealPlanModel.create({ user_id: req.user.id, title: cleanText(title), week_start, week_end, status });
      ok(res, { id: result.insertId }, "Meal plan created", 201);
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async update(req, res) {
    try {
      const existing = await MealPlanModel.getByIdAndUser(req.params.id, req.user.id);
      if (!existing) return err(res, "Meal plan not found", 404);
      const title = cleanText(req.body.title || existing.title);
      const status = req.body.status || existing.status;
      if (!title) return err(res, "title required", 400);
      if (!isAllowed(status, ["draft", "active", "completed"])) return err(res, "status must be draft, active, or completed", 400);
      const result = await MealPlanModel.update(req.params.id, req.user.id, { title, status });
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Meal plan updated");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await MealPlanModel.delete(req.params.id, req.user.id);
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "Meal plan deleted");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async addDay(req, res) {
    try {
      const plan = await MealPlanModel.getByIdAndUser(req.params.id, req.user.id);
      if (!plan) return err(res, "Meal plan not found", 404);
      const { recipe_id, day_of_week, meal_type, servings = 1 } = req.body;
      if (!recipe_id || !day_of_week || !meal_type) return err(res, "recipe_id, day_of_week, meal_type required", 400);
      if (!isPositiveInteger(recipe_id)) return err(res, "recipe_id must be a positive integer", 400);
      if (!Number.isInteger(Number(day_of_week)) || Number(day_of_week) < 1 || Number(day_of_week) > 7) return err(res, "day_of_week must be between 1 and 7", 400);
      if (!isAllowed(meal_type, ["breakfast", "lunch", "dinner", "snack"])) return err(res, "meal_type must be breakfast, lunch, dinner, or snack", 400);
      if (!isPositiveInteger(servings)) return err(res, "servings must be a positive integer", 400);
      const recipe = await RecipeModel.findById(recipe_id);
      if (!recipe) return err(res, "Recipe not found", 404);
      const result = await MealPlanModel.addDay({ meal_plan_id: plan.id, recipe_id: Number(recipe_id), day_of_week: Number(day_of_week), meal_type, servings: Number(servings), user_id: req.user.id });
      ok(res, { id: result.insertId }, "Day added", 201);
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async removeDay(req, res) {
    try {
      const result = await MealPlanModel.removeDay(req.params.dayId, req.user.id);
      if (!result.affectedRows) return err(res, "Day not found", 404);
      ok(res, null, "Day removed");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }

  // AUTO-GENERATE shopping list nga meal plan
  static async generateShoppingList(req, res) {
    try {
      const plan = await MealPlanModel.getByIdAndUser(req.params.id, req.user.id);
      if (!plan) return err(res, "Meal plan not found", 404);

      // Merr ingredientët e nevojshëm
      const required = await MealPlanModel.getRequiredIngredients(plan.id);
      if (!required.length) return err(res, "No ingredients found in meal plan", 400);

      // Merr inventarin aktual
      const available = await InventoryModel.getAvailableIngredients(req.user.id);
      const availableMap = {};
      available.forEach((a) => { availableMap[a.ingredient_id] = Number(a.total_quantity) || 0; });

      // Llogarit çfarë mungon
      const missing = required.filter((r) => {
        const have = availableMap[r.ingredient_id] || 0;
        return have < Number(r.total_needed);
      }).map((r) => ({
        ingredient_id: r.ingredient_id,
        ingredient_name: r.ingredient_name,
        unit: r.unit,
        quantity_needed: Number(r.total_needed) - (availableMap[r.ingredient_id] || 0),
      }));

      if (!missing.length) {
        return ok(res, { message: "You have all ingredients!", missing: [] }, "Nothing to buy");
      }

      // Krijo shopping list automatikisht
      const listResult = await ShoppingListModel.create({
        user_id: req.user.id,
        title: `Blerjet për: ${plan.title}`,
      });
      const listId = listResult.insertId;

      for (const m of missing) {
        await ShoppingListModel.addItem({
          shopping_list_id: listId,
          ingredient_id: m.ingredient_id,
          quantity_needed: parseFloat(m.quantity_needed.toFixed(2)),
          unit: m.unit,
          user_id: req.user.id,
        });
      }

      await createNotificationAndEmit(
        req.user.id,
        "system",
        "Lista e blerjeve u gjenerua",
        `${missing.length} artikuj mungojnë për planin: ${plan.title}`,
        "shopping:generated",
        { listId, planTitle: plan.title, missingCount: missing.length }
      );

      ok(res, { shopping_list_id: listId, missing_count: missing.length, missing }, "Shopping list generated", 201);
    } catch (e) { err(res, "Failed to generate shopping list", 500, e.message); }
  }
}

// ─── SHOPPING LIST CONTROLLER ──────────────────────────────
export class ShoppingListController {
  static async getAll(req, res) {
    try {
      const { search, status, from_date, to_date, sort, order } = req.query;
      const dateError = validateOptionalDateRange(from_date, to_date);
      if (dateError) return err(res, dateError, 400);
      if (status && !isAllowed(status, ["active", "completed", "archived"])) return err(res, "status i pavlefshëm", 400);
      ok(res, await ShoppingListModel.getByUserId(req.user.id, { search, status, from_date, to_date, sort, order }), "Lists fetched");
    }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const list = await ShoppingListModel.getByIdAndUser(req.params.id, req.user.id);
      if (!list) return err(res, "List not found", 404);
      ok(res, list, "List fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async create(req, res) {
    try {
      const title = cleanText(req.body.title);
      if (!title) return err(res, "title required", 400);
      if (title.length < 3 || title.length > 120) return err(res, "title must be between 3 and 120 characters", 400);
      const result = await ShoppingListModel.create({ user_id: req.user.id, title });
      ok(res, { id: result.insertId }, "List created", 201);
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async updateStatus(req, res) {
    try {
      const status = req.body.status;
      if (!isAllowed(status, ["active", "completed", "archived"])) return err(res, "status must be active, completed, or archived", 400);
      const result = await ShoppingListModel.updateStatus(req.params.id, req.user.id, status);
      if (!result.affectedRows) return err(res, "Not found", 404);
      if (status === "completed") {
        await createNotificationAndEmit(req.user.id, "system", "Lista e blerjeve u kompletua", "Të gjithë artikujt e listës janë shënuar si të përfunduar.", "notification:new");
      }
      ok(res, null, "Status updated");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async delete(req, res) {
    try {
      const result = await ShoppingListModel.delete(req.params.id, req.user.id);
      if (!result.affectedRows) return err(res, "Not found", 404);
      ok(res, null, "List deleted");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async addItem(req, res) {
    try {
      const list = await ShoppingListModel.getByIdAndUser(req.params.id, req.user.id);
      if (!list) return err(res, "List not found", 404);
      if (list.status !== "active") return err(res, "Only active shopping lists can be modified", 409);
      const { ingredient_id, quantity_needed, unit } = req.body;
      if (!ingredient_id || !quantity_needed) return err(res, "ingredient_id and quantity_needed required", 400);
      if (!isPositiveInteger(ingredient_id)) return err(res, "ingredient_id must be a positive integer", 400);
      if (!isPositiveNumber(quantity_needed)) return err(res, "quantity_needed must be greater than 0", 400);
      const ingredient = await IngredientModel.findById(ingredient_id);
      if (!ingredient) return err(res, "Ingredient not found", 404);
      const finalUnit = cleanText(unit) || ingredient.unit || "unit";
      const result = await ShoppingListModel.addItem({ shopping_list_id: list.id, ingredient_id: Number(ingredient_id), quantity_needed: Number(quantity_needed), unit: finalUnit, user_id: req.user.id });
      ok(res, { id: result.insertId }, "Item added", 201);
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async markPurchased(req, res) {
    try {
      const list = await ShoppingListModel.getByIdAndUser(req.params.id, req.user.id);
      if (!list) return err(res, "List not found", 404);
      if (list.status !== "active") return err(res, "Only active shopping lists can be modified", 409);
      const result = await ShoppingListModel.markPurchased(req.params.itemId, req.params.id);
      if (!result.affectedRows) return err(res, "Item not found", 404);
      ok(res, null, "Item marked as purchased");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async deleteItem(req, res) {
    try {
      const list = await ShoppingListModel.getByIdAndUser(req.params.id, req.user.id);
      if (!list) return err(res, "List not found", 404);
      if (list.status !== "active") return err(res, "Only active shopping lists can be modified", 409);
      const result = await ShoppingListModel.deleteItem(req.params.itemId, req.params.id);
      if (!result.affectedRows) return err(res, "Item not found", 404);
      ok(res, null, "Item removed");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async suggestions(req, res) {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 25);
      ok(res, await ShoppingListModel.getLowInventorySuggestions(req.user.id, limit), "Shopping suggestions fetched");
    } catch (e) { err(res, "Failed to fetch shopping suggestions", 500, e.message); }
  }
  static async exportShoppingList(req, res) {
    try {
      const list = await ShoppingListModel.getByIdAndUser(req.params.id, req.user.id);
      if (!list) return err(res, "Shopping list not found", 404);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="shopping_list_${req.params.id}.csv"`);
      const csv = [
        "Artikulli,Kategoria,Sasia_e_Nevojshem,Njesia,Blerë",
        ...list.items.map(i => `${csvEscape(i.ingredient_name)},${csvEscape(i.category_name)},${i.quantity_needed},${csvEscape(i.unit)},${csvEscape(i.is_purchased ? "PO" : "JO")}`)
      ].join("\r\n");
      return res.status(200).send(csv);
    } catch (e) { err(res, "Failed to export shopping list", 500, e.message); }
  }
}

// ─── NOTIFICATION CONTROLLER ───────────────────────────────
export class NotificationController {
  static async getMy(req, res) {
    try { ok(res, await NotificationModel.getByUserId(req.user.id), "Notifications fetched"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getById(req, res) {
    try {
      const item = await NotificationModel.findById(req.params.id, req.user.id);
      if (!item) return err(res, "Notification not found", 404);
      await NotificationModel.markRead(req.params.id, req.user.id);
      ok(res, { ...item, is_read: 1 }, "Notification fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async markRead(req, res) {
    try { await NotificationModel.markRead(req.params.id, req.user.id); ok(res, null, "Marked as read"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async markAllRead(req, res) {
    try { await NotificationModel.markAllRead(req.user.id); ok(res, null, "All marked as read"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getUnreadCount(req, res) {
    try { ok(res, { count: await NotificationModel.getUnreadCount(req.user.id) }, "Count fetched"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
}

// ─── REPORT CONTROLLER ─────────────────────────────────────
export class ReportController {
  static async getSummary(req, res) {
    try {
      const { from_date, to_date } = req.query;
      ok(res, await ReportModel.getSummary(req.user.id, from_date, to_date), "Report fetched");
    }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getWaste(req, res) {
    try {
      const { from_date, to_date, format } = req.query;
      const data = await ReportModel.getWaste(req.user.id, from_date, to_date);
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="waste_report.csv"');
        const csv = [
          "ID,Ingridienti,Sasia Humbur (kg),Arsyeja,Data Humbjes",
          ...data.map(r => `${r.id},"${r.ingredient_name.replace(/"/g, '""')}",${r.quantity_wasted},"${(r.reason ?? "").replace(/"/g, '""')}",${r.wasted_at}`)
        ].join("\r\n");
        return res.status(200).send(csv);
      }
      ok(res, data, "Waste log fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getConsumption(req, res) {
    try {
      const { from_date, to_date, format } = req.query;
      const data = await ReportModel.getConsumption(req.user.id, from_date, to_date);
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="consumption_report.csv"');
        const csv = [
          "ID,Ingridienti,Sasia Konsumuar,Metoda,Data Konsumimit",
          ...data.map(r => `${r.id},"${r.ingredient_name.replace(/"/g, '""')}",${r.quantity_used},"${(r.purpose ?? "").replace(/"/g, '""')}",${r.consumed_at}`)
        ].join("\r\n");
        return res.status(200).send(csv);
      }
      ok(res, data, "Consumption log fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }
  static async getAuditLogs(req, res) {
    try { ok(res, await AuditLogModel.getAll(200), "Audit logs fetched"); }
    catch (e) { err(res, "Failed", 500, e.message); }
  }
}


// ─── MARKETPLACE / STORE ORDER CONTROLLER ──────────────────
export class MarketplaceController {
  static async getStores(req, res) {
    try { ok(res, await MarketplaceModel.getStores(), "Stores fetched"); }
    catch (e) { err(res, "Marketplace tables missing. Run migrations/2026_05_26_market_orders.sql", 500, e.message); }
  }

  static async createOrder(req, res) {
    try {
      const { shopping_list_id, store_id, delivery_address, delivery_note, payment_method = "cash" } = req.body;
      if (!isPositiveInteger(shopping_list_id) || !isPositiveInteger(store_id)) return err(res, "shopping_list_id dhe store_id janë të detyrueshme", 400);
      if (!isAllowed(payment_method, ["cash", "wallet"])) return err(res, "payment_method duhet të jetë cash ose wallet", 400);
      if (payment_method === "wallet") return err(res, "Wallet është planifikuar për fazën tjetër. Për tani përdor cash.", 409);
      const address = cleanText(delivery_address);
      if (address.length < 8 || address.length > 255) return err(res, "delivery_address duhet të ketë 8-255 karaktere", 400);
      const list = await ShoppingListModel.getByIdAndUser(shopping_list_id, req.user.id);
      if (!list) return err(res, "Shopping list not found", 404);
      if (list.status !== "active") return err(res, "Mund të porositet vetëm listë aktive", 409);
      const activeItems = list.items?.filter((item) => !item.is_purchased) || [];
      if (!activeItems.length) return err(res, "Nuk mund të porositet listë bosh ose e përfunduar", 400);
      const store = await MarketplaceModel.findStoreById(store_id);
      if (!store) return err(res, "Store not found", 404);
      const result = await MarketplaceModel.createOrderFromShoppingList({
        user_id: req.user.id, shopping_list_id, store_id, delivery_address: address, delivery_note: cleanText(delivery_note) || null, payment_method
      });
      await createNotificationAndEmit(req.user.id, "order", "Porosia u krijua", `Porosia #${result.insertId} u dërgua te ${store.name}. Totali i parashikuar: ${result.estimated_total}€. Pagesa: cash.`, "notification:new", { order_id: result.insertId, status: "pending" });
      ok(res, { id: result.insertId, estimated_total: result.estimated_total, delivery_fee: result.delivery_fee }, "Order created", 201);
    } catch (e) { err(res, "Failed to create order", 500, e.message); }
  }

  static async myOrders(req, res) {
    try { ok(res, await MarketplaceModel.getOrdersForUser(req.user.id), "Orders fetched"); }
    catch (e) { err(res, "Failed to fetch orders", 500, e.message); }
  }

  static async storeOrders(req, res) {
    try {
      const { status } = req.query;
      if (status && !isAllowed(status, Object.keys(ORDER_STATUS_LABELS))) return err(res, "Status i pavlefshëm", 400);
      ok(res, await MarketplaceModel.getOrdersForStoreManager({ status }), "Store orders fetched");
    } catch (e) { err(res, "Failed to fetch store orders", 500, e.message); }
  }

  static async courierOrders(req, res) {
    try {
      const { status } = req.query;
      if (status && !isAllowed(status, Object.keys(ORDER_STATUS_LABELS))) return err(res, "Status i pavlefshëm", 400);
      ok(res, await MarketplaceModel.getOrdersForCourier({ courierId: req.user.id, status }), "Courier orders fetched");
    } catch (e) { err(res, "Failed to fetch courier orders", 500, e.message); }
  }

  static async getOrderById(req, res) {
    try {
      const order = await MarketplaceModel.findOrderById(req.params.id);
      if (!order) return err(res, "Order not found", 404);
      const userOwns = Number(order.user_id) === Number(req.user.id);
      const courierCanView = isCourier(req) && (Number(order.courier_id || 0) === Number(req.user.id) || (!order.courier_id && ["accepted", "preparing"].includes(order.status)));
      if (!isManagerOrAdmin(req) && !userOwns && !courierCanView) return err(res, "Forbidden", 403);
      ok(res, order, "Order fetched");
    } catch (e) { err(res, "Failed to fetch order", 500, e.message); }
  }

  static async updateOrderStatus(req, res) {
    try {
      const status = req.body.status;
      if (!isAllowed(status, ["accepted", "rejected", "preparing", "out_for_delivery", "delivered", "cancelled"])) return err(res, "Status i pavlefshëm", 400);
      const order = await MarketplaceModel.findOrderById(req.params.id);
      if (!order) return err(res, "Order not found", 404);
      const allowedNext = VALID_ORDER_TRANSITIONS[order.status] || [];
      if (!allowedNext.includes(status)) return err(res, `Statusi nuk mund të kalojë nga ${order.status} në ${status}`, 409);

      if (isCourier(req) && !isManagerOrAdmin(req)) {
        if (!["out_for_delivery", "delivered"].includes(status)) return err(res, "Korrieri mund të ndryshojë vetëm statuset e dorëzimit", 403);
        if (status === "out_for_delivery" && order.status !== "preparing") return err(res, "Korrieri mund ta nisë vetëm porosinë që është në përgatitje", 409);
        if (order.courier_id && Number(order.courier_id) !== Number(req.user.id)) return err(res, "Kjo porosi i është caktuar një korrieri tjetër", 403);
        if (!order.courier_id) await MarketplaceModel.claimOrder(req.params.id, req.user.id);
      } else if (!isManagerOrAdmin(req)) {
        return err(res, "Forbidden", 403);
      }

      const result = await MarketplaceModel.updateOrderStatus(req.params.id, status, req.user.id);
      if (!result.affectedRows) return err(res, "Order not found", 404);
      const label = ORDER_STATUS_LABELS[status] || status;
      const actor = isCourier(req) && !isManagerOrAdmin(req) ? "korrieri" : "marketi";
      await createNotificationAndEmit(order.user_id, "order", `Porosia #${order.id}: ${label}`, `Statusi i porosisë u përditësua nga ${actor}. Totali: ${Number(order.estimated_total || 0).toFixed(2)}€`, "notification:new", { order_id: order.id, status });
      io?.to(`user_${order.user_id}`).emit("order:status", { order_id: order.id, status, label });
      ok(res, null, "Order status updated");
    } catch (e) { err(res, "Failed to update order", 500, e.message); }
  }

  static async claimOrder(req, res) {
    try {
      const order = await MarketplaceModel.findOrderById(req.params.id);
      if (!order) return err(res, "Order not found", 404);
      if (!isOrderStaff(req)) return err(res, "Forbidden", 403);
      if (!["accepted", "preparing"].includes(order.status)) return err(res, "Mund të merret vetëm porosi e pranuar ose në përgatitje", 409);
      if (order.courier_id && Number(order.courier_id) !== Number(req.user.id)) return err(res, "Porosia është marrë nga një korrier tjetër", 409);
      await MarketplaceModel.claimOrder(req.params.id, req.user.id);
      await createNotificationAndEmit(order.user_id, "order", `Porosia #${order.id}: Korrieri u caktua`, "Porosia është marrë nga korrieri dhe do të niset pas përgatitjes.", "notification:new", { order_id: order.id, status: order.status });
      ok(res, null, "Order claimed");
    } catch (e) { err(res, "Failed to claim order", 500, e.message); }
  }

  static async rebuy(req, res) {
    try {
      const result = await MarketplaceModel.rebuyOrder(req.params.id, req.user.id);
      await createNotificationAndEmit(req.user.id, "order", "Lista për riblerje u krijua", `U krijua një listë e re nga porosia #${req.params.id}.`, "notification:new", { shopping_list_id: result.shopping_list_id });
      ok(res, result, "Re-buy shopping list created", 201);
    } catch (e) { err(res, "Failed to re-buy order", 500, e.message); }
  }

  static async spending(req, res) {
    try { ok(res, await MarketplaceModel.getMonthlySpending(req.user.id), "Monthly spending fetched"); }
    catch (e) { err(res, "Failed to fetch spending", 500, e.message); }
  }

  static async budgetForecast(req, res) {
    try {
      const today = new Date();
      const nextMonth = today.getMonth() + 2;
      const defaultMonth = nextMonth > 12 ? 1 : nextMonth;
      const defaultYear = nextMonth > 12 ? today.getFullYear() + 1 : today.getFullYear();
      const targetMonth = Number(req.query.month || defaultMonth);
      const targetYear = Number(req.query.year || defaultYear);
      if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) return err(res, "month duhet të jetë 1-12", 400);
      if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) return err(res, "year i pavlefshëm", 400);
      ok(res, await MarketplaceModel.getBudgetForecast(req.user.id, targetMonth, targetYear), "Budget forecast generated");
    } catch (e) { err(res, "Failed to generate forecast", 500, e.message); }
  }
}

// ─── ML RECOMMENDATION CONTROLLER ─────────────────────────
export class MLController {
  static async getMy(req, res) {
    try {
      const startTime = Date.now();
      let recommendations = [];
      try {
        const response = await axios.get(`http://localhost:8000/ml/recommendations/${req.user.id}`, { timeout: 4000 });
        if (response.data?.recommendations) {
          recommendations = response.data.recommendations;
          await MLRecommendation.create({
            user_id: req.user.id,
            model_type: "recipe_recommendation",
            output_data: recommendations,
            model_version: "1.0.0",
            execution_time_ms: Date.now() - startTime,
            expires_at: new Date(Date.now() + 24 * 3600 * 1000), // 24h expiry TTL
          });
        }
      } catch (axErr) {
        console.log("FastAPI ML Service offline, fallback to MongoDB cache:", axErr.message);
      }

      // Fetch the most recent cached recipe recommendation from MongoDB
      const cached = await MLRecommendation.findOne({
        user_id: req.user.id,
        model_type: "recipe_recommendation"
      }).sort({ created_at: -1 });

      ok(res, cached ? cached.output_data : [], "Recommendations fetched");
    } catch (e) { err(res, "Failed to fetch recommendations", 500, e.message); }
  }
  static async getAll(req, res) {
    try {
      const data = await MLRecommendation.find().sort({ created_at: -1 }).limit(50);
      ok(res, data, "All recommendations fetched");
    } catch (e) { err(res, "Failed", 500, e.message); }
  }

  // ── Proxy helpers → FastAPI ML Service ─────────────────
  static async _mlProxy(req, res, method, path, body = null) {
    const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
    try {
      const cfg = { timeout: 10000 };
      const response = method === "POST"
        ? await axios.post(`${ML_URL}${path}`, body, cfg)
        : await axios.get(`${ML_URL}${path}`, cfg);
      ok(res, response.data, "ML response");
    } catch (e) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((item) => `${item.loc?.join(".") || "request"}: ${item.msg}`).join("; ")
        : typeof detail === "object" && detail !== null
          ? JSON.stringify(detail)
          : detail || e.message;
      err(res, `ML Service: ${msg}`, e.response?.status || 503);
    }
  }

  static async classifiersCompare(req, res) {
    const retrain = req.query.retrain === "true" ? "?retrain=true" : "";
    await MLController._mlProxy(req, res, "GET", `/ml/classifiers/compare${retrain}`);
  }

  static async classifyRisk(req, res) {
    await MLController._mlProxy(req, res, "POST", "/ml/classify/risk", req.body);
  }

  static async clusteringMy(req, res) {
    const n = Number(req.query.n_clusters) || 3;
    await MLController._mlProxy(req, res, "GET", `/ml/clustering/${req.user.id}?n_clusters=${n}`);
  }

  static async preferencesMy(req, res) {
    await MLController._mlProxy(req, res, "GET", `/ml/preferences/${req.user.id}`);
  }

  static async predictExpiry(req, res) {
    await MLController._mlProxy(req, res, "POST", "/ml/predict/expiry", req.body);
  }

  static async predictWaste(req, res) {
    await MLController._mlProxy(req, res, "POST", "/ml/predict/waste", req.body);
  }
}
