import { Router } from "express";
import multer from "multer";
import { MLController } from "../controllers/ml.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });
const auth = [AuthMiddleware, ActiveMiddleware];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get("/health", ...auth, MLController.health);
router.get("/recommendations/my", ...auth, MLController.getMy);
router.get("/recommendations", ...admin, MLController.getAll);
router.get("/classifiers/compare",...auth, MLController.classifiersCompare);
router.post("/classify/risk", ...auth, MLController.classifyRisk);
router.get("/clustering", ...auth, MLController.clustering);
router.get("/clustering/my", ...auth, MLController.clusteringMy);
router.get("/preferences", ...auth, MLController.preferences);
router.get("/preferences/my", ...auth, MLController.preferencesMy);
router.post("/predict/expiry", ...auth, MLController.predictExpiry);
router.post("/detect-food-image", ...auth, upload.single("image"), MLController.detectFoodImage);
router.post("/predict/waste", ...auth, MLController.predictWaste);

export default router;
