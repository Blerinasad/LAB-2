import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js"
const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];
router.get("/summary", ...auth, DashboardController.getSummary);
router.get("/activity", ...auth, DashboardController.getActivity);
router.get("/charts", ...auth, DashboardController.getCharts);
export default router;
