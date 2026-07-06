import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/", ...admin, UserController.getAll);
router.get("/:id", ...admin, UserController.getById);
router.post("/", ...admin, UserController.create);
router.put("/:id", ...admin, UserController.update);
router.delete("/:id", ...admin, UserController.delete);
router.patch("/:id/toggle", ...admin, UserController.toggle);

export default router;
