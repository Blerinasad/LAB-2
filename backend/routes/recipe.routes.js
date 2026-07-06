import { Router } from "express";
import { RecipeController } from "../controllers/recipe.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const all = [AuthMiddleware, ActiveMiddleware];
const mgr = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/export", ...all, RecipeController.exportRecipes);
router.get("/", ...all, RecipeController.getAll);
router.get("/:id", ...all, RecipeController.getById);
router.post("/", ...mgr, RecipeController.create);
router.put("/:id", ...mgr, RecipeController.update);
router.delete("/:id", ...admin, RecipeController.delete);
router.post("/:id/rate",...all, RecipeController.rate);

export default router;
