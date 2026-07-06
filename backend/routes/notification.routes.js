import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js"

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];

router.get("/unread-count", ...auth, NotificationController.getUnreadCount);
router.get("/my", ...auth, NotificationController.getMy);
router.get("/", ...auth, NotificationController.getMy);
router.patch("/read-all", ...auth, NotificationController.markAllRead);
router.patch("/mark-all-read", ...auth, NotificationController.markAllRead);
router.get("/:id", ...auth, NotificationController.getById);
router.patch("/:id/read", ...auth, NotificationController.markRead);

export default router;
