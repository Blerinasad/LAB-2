import axios from "axios";
import { db } from "../config/db.js";
import { MLRecommendation } from "../models/mongo/ml-recommendation.model.js";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function mlProxy(method, path, body=null, timeout=15000) {
  const url = `${ML_URL}${path}`;
  const res = method==="GET"
    ? await axios.get(url, { timeout })
    : await axios.post(url, body, { timeout });
  return res.data;
}

export class MLService {
  static async health() {
    try {
      return await mlProxy("GET", "/health", null, 5000);
    } catch {
      try {
        return await mlProxy("GET", "/ml/health", null, 5000);
      } catch {
        throw { status: 503, message: "ML Service offline" };
      }
    }
  }

  static async getMyRecommendations(userId) {
    // Merr inventarin e userit
    const [inventory] = await db.query(`
      SELECT ii.ingredient_id, ii.quantity, ii.expiry_date,
             i.name, i.category_id,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_until_expiry
      FROM InventoryItems ii
      JOIN Ingredients i ON i.id=ii.ingredient_id
      WHERE ii.user_id=? AND ii.expiry_date >= CURDATE()
      ORDER BY days_until_expiry ASC`, [userId]);

    // Merr të gjitha recetat
    const [recipes] = await db.query(`
      SELECT r.id, r.title, r.difficulty, r.prep_time_min, r.meal_type,
             GROUP_CONCAT(ri.ingredient_id) AS ingredient_ids,
             GROUP_CONCAT(i.name SEPARATOR '|') AS ingredient_names
      FROM Recipes r
      JOIN RecipeIngredients ri ON ri.recipe_id=r.id
      JOIN Ingredients i ON i.id=ri.ingredient_id
      WHERE r.is_public=1
      GROUP BY r.id`);

    const inventoryIds = new Set(inventory.map(i => String(i.ingredient_id)));

    // Score sipas match percentage
    const recs = recipes.map(recipe => {
      const recipeIngIds = (recipe.ingredient_ids||"").split(",").filter(Boolean);
      const recipeIngNames = (recipe.ingredient_names||"").split("|").filter(Boolean);
      const matched = recipeIngIds.filter(id => inventoryIds.has(id)).length;
      const total = recipeIngIds.length || 1;
      const matchPct = Math.round((matched/total)*100);
      const missing = recipeIngIds
        .filter(id => !inventoryIds.has(id))
        .map((id, idx) => recipeIngNames[recipeIngIds.indexOf(id)] || `Ingredient ${id}`);

      return {
        recipe_id: recipe.id, title: recipe.title,
        difficulty: recipe.difficulty, prep_time_min: recipe.prep_time_min,
        meal_type: recipe.meal_type,
        match_percentage: matchPct,
        score: Number((matchPct/100).toFixed(2)),
        missing_ingredients: missing.slice(0,8),
      };
    })
    .filter(r => r.match_percentage >= 20)
    .sort((a,b) => b.match_percentage - a.match_percentage)
    .slice(0,10);

    return recs;
  }

  static async classifiersCompare(retrain=false) {
    try {
      // Timeout më i gjatë kur retrain=true — GridSearchCV mbi 4 modele mund të zgjasë.
      return await mlProxy("GET", `/ml/classifiers/compare${retrain?"?retrain=true":""}`, null, retrain ? 45000 : 15000);
    } catch(e) {
      throw { status:503, message:"ML Service offline. Nis: uvicorn main:app --port 8000" };
    }
  }

  static async classifyRisk(data) {
    try {
      return await mlProxy("POST", "/ml/classify/risk", data);
    } catch(e) {
      // Fallback lokal
      const { days_until_expiry, category_id } = data;
      const days = Number(days_until_expiry);
      const perishable = [1,2,3,4].includes(Number(category_id));
      let risk_level = "low";
      if (days < 0) risk_level = "high";
      else if (days <= 2) risk_level = "high";
      else if (days <= 5 && perishable) risk_level = "high";
      else if (days <= 7) risk_level = "medium";
      return { risk_level, model_used:"fallback_rule_based", probabilities:{ low:null, medium:null, high:null } };
    }
  }

  static async clusteringMy(userId, n_clusters=3) {
    try {
      return await mlProxy("GET", `/ml/clustering/${userId}?n_clusters=${n_clusters}`, null, 25000);
    } catch {
      throw { status:503, message:"ML Service offline" };
    }
  }

  static async preferencesMy(userId) {
    try {
      return await mlProxy("GET", `/ml/preferences/${userId}`);
    } catch {
      return { predicted_preference:"Standard", confidence_score:0.5, profile_ratios:{} };
    }
  }

  static async predictExpiry(data) {
    try { return await mlProxy("POST", "/ml/predict/expiry", data); }
    catch { throw { status:503, message:"ML Service offline" }; }
  }

  static async predictWaste(data) {
    try { return await mlProxy("POST", "/ml/predict/waste", data); }
    catch { throw { status:503, message:"ML Service offline" }; }
  }

  static async getAllFromMongo() {
    try { return await MLRecommendation.find().sort({ created_at:-1 }).limit(50); }
    catch { return []; }
  }

  static async suggestRecipesFor(detectedName) {
    if (!detectedName) return [];
    try {
      const [rows] = await db.query(
        `SELECT DISTINCT r.title
         FROM Recipes r
         JOIN RecipeIngredients ri ON ri.recipe_id = r.id
         JOIN Ingredients i ON i.id = ri.ingredient_id
         WHERE r.is_public = 1 AND i.name LIKE ?
         ORDER BY r.created_at DESC LIMIT 3`,
        [`%${detectedName}%`]
      );
      return rows.map(r => r.title);
    } catch {
      return [];
    }
  }

  // Normalizon output-in në kontratën e kërkuar nga API:
  // { detected_product, confidence, category, shelf_life_estimate,
  //   storage_recommendation, suggested_recipes, quantity_estimate, note }
  static async shapeDetectionResult(raw) {
    const suggested_recipes = await MLService.suggestRecipesFor(raw.detected_name);
    return {
      detected_product: raw.detected_name,
      confidence: raw.confidence,
      category: raw.category,
      shelf_life_estimate: raw.shelf_life_days != null ? `${raw.shelf_life_days} ditë` : null,
      storage_recommendation: raw.storage_recommendation,
      suggested_recipes,
      quantity_estimate: raw.quantity_estimate ?? null,
      note: raw.quantity_note || null,
      // fusha shtesë të nevojshme për frontend (njësia, data e skadimit, demo flag)
      unit: raw.unit,
      suggested_expiry: raw.suggested_expiry,
      demo_mode: raw.demo_mode,
      alternatives: raw.alternatives || [],
    };
  }

  static async detectFoodImage(imageBase64, mimeType="image/jpeg") {
    const apiKey = process.env.OPENAI_API_KEY || "";
    const demo = process.env.ENABLE_DEMO_AI !== "false";

    // Fallback demo — provo së pari heuristikën REALE të ngjyrave në ML-service (Python),
    // që analizon pikselat e fotos aktuale (deterministe). Lista statike përdoret
    // vetëm si mbrojtje e fundit nëse ML-service është offline.
    if (!apiKey) {
      if (!demo) throw { status:503, message:"OPENAI_API_KEY mungon dhe ENABLE_DEMO_AI=false" };

      try {
        const buf = Buffer.from(imageBase64, "base64");
        const form = new FormData();
        form.append("image", new Blob([buf], { type: mimeType }), "photo.jpg");
        const axios = (await import("axios")).default;
        const { data: h } = await axios.post(`${ML_URL}/ml/detect-food-image`, form, { timeout: 15000 });
        if (!h.error) {
          const days = parseInt(h.shelf_life_estimate) || 7;
          const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
          return MLService.shapeDetectionResult({
            demo_mode: true,
            detected_name: h.detected_product,
            alternatives: h.alternatives || [],
            category: h.category,
            confidence: h.confidence,
            quantity_estimate: h.quantity_estimate ?? null,
            quantity_note: h.note || "Sasia nuk mund të vlerësohet me besueshmëri nga fotoja.",
            unit: "kg",
            shelf_life_days: days,
            suggested_expiry: expiry.toISOString().slice(0,10),
            storage_recommendation: h.storage_recommendation || "Fridge",
          });
        }
      } catch { /* ML-service offline → vazhdo te fallback-u statik */ }

      const DEMO = [
        { name:"Domate",    category:"Perime",   qty:null, unit:"kg",   shelf_days:7,  storage:"Fridge" },
        { name:"Qumësht",   category:"Bulmet",   qty:null, unit:"l",    shelf_days:5,  storage:"Fridge" },
        { name:"Mish pule", category:"Mish",     qty:null, unit:"kg",   shelf_days:3,  storage:"Fridge" },
        { name:"Mollë",     category:"Fruta",    qty:null, unit:"kg",   shelf_days:21, storage:"Fridge" },
        { name:"Pasta",     category:"Drithëra", qty:null, unit:"kg",   shelf_days:365,storage:"Pantry" },
        { name:"Vezë",      category:"Bulmet",   qty:6,    unit:"cope", shelf_days:21, storage:"Fridge" },
      ];
      await new Promise(r => setTimeout(r, 400));
      const product = DEMO[Math.floor(Math.random() * DEMO.length)];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + product.shelf_days);
      return MLService.shapeDetectionResult({
        demo_mode: true,
        detected_name: product.name,
        alternatives: DEMO.filter(p => p.name !== product.name).slice(0,3).map(p => p.name),
        category: product.category,
        confidence: 50, // konfidencë e ndershme — rezultat shembull, jo analizë e fotos
        quantity_estimate: product.qty,
        quantity_note: product.qty === null ? "Sasia nuk mund të vlerësohet me besueshmëri nga fotoja." : null,
        unit: product.unit,
        shelf_life_days: product.shelf_days,
        suggested_expiry: expiry.toISOString().slice(0,10),
        storage_recommendation: product.storage,
      });
    }

    // OpenAI Vision
    try {
      const axios = (await import("axios")).default;
      const res = await axios.post("https://api.openai.com/v1/chat/completions", {
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type:"text", text:`Identifiko produktin ushqimor. Kthe VETËM JSON pa komente:
{
  "detected_name": "emri shqip",
  "category": "Perime|Fruta|Mish|Bulmet|Drithëra|Erëza",
  "confidence": 0-100,
  "quantity_estimate": numër ose null nëse nuk mund të vlerësohet,
  "quantity_note": "shpjegim nëse null",
  "unit": "kg|l|cope",
  "shelf_life_days": numër,
  "storage_recommendation": "Fridge|Pantry|Freezer"
}
Nëse nuk është ushqim: {"error":"jo ushqim"}` },
            { type:"image_url", image_url:{ url:`data:${mimeType};base64,${imageBase64}`, detail:"low" } },
          ],
        }],
      }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout:20000 });

      const text = res.data.choices?.[0]?.message?.content || "{}";
      const json = JSON.parse(text.replace(/```json|```/g,"").trim());
      if (json.error) throw { status:422, message:json.error };

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (json.shelf_life_days || 7));
      return MLService.shapeDetectionResult({ demo_mode:false, ...json, suggested_expiry: expiry.toISOString().slice(0,10) });
    } catch(e) {
      if (!demo) throw { status:503, message:"OpenAI Vision nuk u përgjigj dhe ENABLE_DEMO_AI=false" };

      try {
        const buf = Buffer.from(imageBase64, "base64");
        const form = new FormData();
        form.append("image", new Blob([buf], { type: mimeType }), "photo.jpg");
        const axios = (await import("axios")).default;
        const { data: h } = await axios.post(`${ML_URL}/ml/detect-food-image`, form, { timeout: 15000 });
        if (!h.error) {
          const days = parseInt(h.shelf_life_estimate) || 7;
          const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
          return MLService.shapeDetectionResult({
            demo_mode: true,
            detected_name: h.detected_product,
            alternatives: h.alternatives || [],
            category: h.category,
            confidence: h.confidence,
            quantity_estimate: h.quantity_estimate ?? null,
            quantity_note: h.note || "Sasia nuk mund të vlerësohet me besueshmëri nga fotoja.",
            unit: "kg",
            shelf_life_days: days,
            suggested_expiry: expiry.toISOString().slice(0,10),
            storage_recommendation: h.storage_recommendation || "Fridge",
          });
        }
      } catch { /* ML-service offline → vazhdo te fallback-u statik */ }

      const DEMO = [
        { name:"Domate", category:"Perime", qty:null, unit:"kg", shelf_days:7, storage:"Fridge" },
        { name:"Qumësht", category:"Bulmet", qty:null, unit:"l", shelf_days:5, storage:"Fridge" },
        { name:"Mish pule", category:"Mish", qty:null, unit:"kg", shelf_days:3, storage:"Fridge" },
        { name:"Mollë", category:"Fruta", qty:null, unit:"kg", shelf_days:21, storage:"Fridge" },
        { name:"Pasta", category:"Drithëra", qty:null, unit:"kg", shelf_days:365, storage:"Pantry" },
        { name:"Vezë", category:"Bulmet", qty:6, unit:"cope", shelf_days:21, storage:"Fridge" },
      ];
      const product = DEMO[Math.floor(Math.random() * DEMO.length)];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + product.shelf_days);
      return MLService.shapeDetectionResult({
        demo_mode: true,
        detected_name: product.name,
        alternatives: DEMO.filter(p => p.name !== product.name).slice(0,3).map(p => p.name),
        category: product.category,
        confidence: 50,
        quantity_estimate: product.qty,
        quantity_note: product.qty === null ? "Sasia nuk mund të vlerësohet me besueshmëri nga fotoja." : null,
        unit: product.unit,
        shelf_life_days: product.shelf_days,
        suggested_expiry: expiry.toISOString().slice(0,10),
        storage_recommendation: product.storage,
      });
    }
  }

}
