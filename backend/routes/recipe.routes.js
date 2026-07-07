import { Router } from "express";
import { RecipeController } from "../controllers/recipe.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const all = [AuthMiddleware, ActiveMiddleware];
const user = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("User")];

router.get ("/export", ...all, RecipeController.exportRecipes);
router.get ("/", ...all, RecipeController.getAll);
router.get ("/:id", ...all, RecipeController.getById);
router.post ("/", ...user, RecipeController.create);
router.put ("/:id", ...user, RecipeController.update);
router.delete("/:id", ...user, RecipeController.delete);
router.post ("/:id/rate",...all, RecipeController.rate);

export default router;
