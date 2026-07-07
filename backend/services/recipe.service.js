import { db } from "../config/db.js";

function normalizeUnit(unit) {
  const normalized = unit === "cope" ? "piece" : unit;
  return ["piece","g","kg","ml","l","pack","box","bottle","can","slice"].includes(normalized) ? normalized : "piece";
}

export class RecipeService {

  static async getAll({ search, difficulty, meal_type, page=1, limit=20 } = {}) {
    const where = ["1=1"];
    const params = [];
    if (search) { where.push("MATCH(r.title) AGAINST(? IN BOOLEAN MODE)"); params.push(`${search}*`); }
    if (difficulty) { where.push("r.difficulty=?"); params.push(difficulty); }
    if (meal_type) { where.push("r.meal_type=?"); params.push(meal_type); }

    const offset = (Number(page)-1) * Number(limit);
    const [[{total}]] = await db.query(`SELECT COUNT(*) AS total FROM Recipes r WHERE ${where.join(" AND ")}`, params);
    const [rows] = await db.query(
      `SELECT r.id, r.title, r.description, r.prep_time_min, r.cook_time_min,
              r.servings, r.difficulty, r.meal_type, r.is_public, r.created_at,
              u.first_name, u.last_name,
              ROUND(AVG(rr.rating),1) AS avg_rating, COUNT(rr.id) AS rating_count
       FROM Recipes r
       LEFT JOIN Users u ON u.id = r.created_by
       LEFT JOIN RecipeRatings rr ON rr.recipe_id = r.id
       WHERE ${where.join(" AND ")}
       GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]);
    return { items: rows, total };
  }

  static async getById(id) {
    const [[recipe]] = await db.query(`
      SELECT r.*, u.first_name, u.last_name,
             ROUND(AVG(rr.rating),1) AS avg_rating, COUNT(rr.id) AS rating_count
      FROM Recipes r
      LEFT JOIN Users u ON u.id = r.created_by
      LEFT JOIN RecipeRatings rr ON rr.recipe_id = r.id
      WHERE r.id=? GROUP BY r.id`, [id]);
    if (!recipe) throw { status: 404, message: "Receta nuk u gjet" };

    const [ingredients] = await db.query(`
      SELECT ri.id, ri.quantity, ri.unit, ri.is_optional,
             i.id AS ingredient_id, i.name AS ingredient_name
      FROM RecipeIngredients ri
      JOIN Ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id=?`, [id]);

    return { ...recipe, ingredients };
  }

  static async create(userId, data) {
    const { title, description, instructions, prep_time_min, cook_time_min,
            servings, difficulty, meal_type, is_public, ingredients=[] } = data;
    if (!title?.trim()) throw { status: 400, message: "Titulli është i detyrueshëm" };
    if (!instructions?.trim()) throw { status: 400, message: "Udhëzimet janë të detyrueshme" };

    const [result] = await db.query(
      `INSERT INTO Recipes (title,description,instructions,prep_time_min,cook_time_min,servings,difficulty,meal_type,is_public,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [title.trim(), description||null, instructions.trim(),
       prep_time_min||null, cook_time_min||null, servings||null,
       difficulty||"medium", meal_type||null, is_public??1, userId]);

    for (const ing of ingredients) {
      if (!ing.ingredient_id || !ing.quantity || !ing.unit) continue;
      await db.query(
        "INSERT INTO RecipeIngredients (recipe_id,ingredient_id,quantity,unit,is_optional) VALUES (?,?,?,?,?)",
        [result.insertId, ing.ingredient_id, ing.quantity, normalizeUnit(ing.unit), ing.is_optional||0]);
    }
    return this.getById(result.insertId);
  }

  static async update(id, userId, data) {
    const recipe = await this.getById(id);
    if (Number(recipe.created_by || 0) !== Number(userId)) {
      throw { status: 403, message: "Mund të ndryshosh vetëm recetat e tua" };
    }
    const fields = [];
    const params = [];
    ["title","description","instructions","prep_time_min","cook_time_min","servings","difficulty","meal_type","is_public"].forEach(f => {
      if (data[f] !== undefined) { fields.push(`${f}=?`); params.push(data[f]); }
    });
    if (!fields.length) throw { status: 400, message: "Asgjë për të përditësuar" };
    params.push(id);
    await db.query(`UPDATE Recipes SET ${fields.join(",")}, updated_by=?, updated_at=NOW() WHERE id=?`,
      [...params.slice(0,-1), userId, id]);
    return this.getById(id);
  }

  static async delete(id, userId) {
    const recipe = await this.getById(id);
    if (Number(recipe.created_by || 0) !== Number(userId)) {
      throw { status: 403, message: "Mund të fshish vetëm recetat e tua" };
    }
    await db.query("DELETE FROM RecipeIngredients WHERE recipe_id=?", [id]);
    await db.query("DELETE FROM Recipes WHERE id=?", [id]);
  }

  static async rate(recipeId, userId, rating, comment) {
    if (!rating || rating < 1 || rating > 5)
      throw { status: 400, message: "Rating duhet të jetë 1-5" };
    await db.query(
      `INSERT INTO RecipeRatings (recipe_id,user_id,rating,comment)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment), updated_at=NOW()`,
      [recipeId, userId, rating, comment||null]);
    const [[avg]] = await db.query(
      "SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS total FROM RecipeRatings WHERE recipe_id=?",
      [recipeId]);
    return avg;
  }

  static async exportCSV(userId) {
    const { items } = await this.getAll({ limit: 9999 });
    const header = "ID,Titulli,Vakti,Vështirësia,Prep(min),Gatim(min),Servime,Rating\n";
    const rows = items.map(r =>
      `${r.id},"${r.title}",${r.meal_type||""},${r.difficulty},${r.prep_time_min||0},${r.cook_time_min||0},${r.servings||0},${r.avg_rating||0}`
    ).join("\n");
    return header + rows;
  }
}
