import { Router } from "express";
import { ReportController } from "../controllers/report.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];
const manager = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];

router.get("/system", ...admin, ReportController.getSystemSummary);
router.get("/manager", ...manager, ReportController.getManagerSummary);
router.get("/summary", ...auth, ReportController.getSummary);
router.get("/waste", ...auth, ReportController.getWaste);
router.get("/consumption", ...auth, ReportController.getConsumption);
router.get("/audit", ...admin, ReportController.getAuditLogs);

export default router;
