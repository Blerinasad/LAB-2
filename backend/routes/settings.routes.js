import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/", ...admin, SettingsController.getAll);
router.get("/:key", ...admin, SettingsController.getByKey);
router.put("/:key", ...admin, SettingsController.updateByKey);

export default router;
