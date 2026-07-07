import { Router } from "express";
import { MealPlanController } from "../controllers/meal-plan.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("User")];

router.get ("/", ...auth, MealPlanController.getAll);
router.get ("/:id", ...auth, MealPlanController.getById);
router.post ("/", ...auth, MealPlanController.create);
router.put ("/:id", ...auth, MealPlanController.update);
router.delete("/:id", ...auth, MealPlanController.delete);
router.post ("/:id/days", ...auth, MealPlanController.addDay);
router.delete("/:id/days/:dayId", ...auth, MealPlanController.removeDay);
router.post ("/:id/generate-shopping", ...auth, MealPlanController.generateShoppingList);

export default router;
