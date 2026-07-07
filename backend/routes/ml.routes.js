import { Router } from "express";
import multer from "multer";
import { MLRecommendationController } from "../controllers/MLRecommendation.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024 } });
const auth = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("User")];
const admin = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin")];

router.get ("/recommendations/my", ...auth, MLRecommendationController.getMy);
router.get ("/recommendations", ...admin, MLRecommendationController.getAll);
router.get ("/classifiers/compare",...auth, MLRecommendationController.classifiersCompare);
router.post("/classify/risk", ...auth, MLRecommendationController.classifyRisk);
router.get ("/clustering/my", ...auth, MLRecommendationController.clusteringMy);
router.get ("/preferences/my", ...auth, MLRecommendationController.preferencesMy);
router.post("/predict/expiry", ...auth, MLRecommendationController.predictExpiry);
router.post("/detect-food-image", ...auth, upload.single("image"), MLRecommendationController.detectFoodImage);
router.post("/predict/waste", ...auth, MLRecommendationController.predictWaste);

export default router;
