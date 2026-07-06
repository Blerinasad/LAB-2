import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validate, loginRules, forgotRules, resetRules } from "../middleware/validation.middleware.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js"

const router = Router();

router.post("/login", loginRules, validate, AuthController.login);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);
router.post("/logout-all", AuthMiddleware, ActiveMiddleware, AuthController.logoutAll);
router.post("/forgot-password", forgotRules, validate, AuthController.forgotPassword);
router.post("/reset-password", resetRules, validate, AuthController.resetPassword);
router.get("/me", AuthMiddleware, ActiveMiddleware, AuthController.me);

export default router;
