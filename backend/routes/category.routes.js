import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const all = [AuthMiddleware, ActiveMiddleware];
const mgr = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/", ...all, CategoryController.getAll);
router.get("/:id", ...all, CategoryController.getById);
router.post("/", ...mgr, CategoryController.create);
router.put("/:id", ...mgr, CategoryController.update);
router.delete("/:id", ...admin, CategoryController.delete);

export default router;
