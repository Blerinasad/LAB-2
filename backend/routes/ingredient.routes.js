import { Router } from "express";
import { IngredientController } from "../controllers/ingredient.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const all = [AuthMiddleware, ActiveMiddleware];
const mgr = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/", ...all, IngredientController.getAll);
router.get("/:id", ...all, IngredientController.getById);
router.post("/", ...mgr, IngredientController.create);
router.put("/:id", ...mgr, IngredientController.update);
router.delete("/:id", ...admin, IngredientController.delete);

export default router;
