import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];
const canEdit = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin", "Manager")];

router.get("/", ...auth, SettingsController.getAll);
router.put("/:key", ...canEdit, SettingsController.updateByKey);

export default router;
