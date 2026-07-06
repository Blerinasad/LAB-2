import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import ingredientRoutes from "./ingredient.routes.js";
import categoryRoutes from "./category.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import recipeRoutes from "./recipe.routes.js";
import mealplanRoutes from "./meal-plan.routes.js";
import shoppingRoutes from "./shopping-list.routes.js";
import notifRoutes from "./notification.routes.js";
import reportRoutes from "./report.routes.js";
import marketRoutes from "./marketplace.routes.js";
import mlRoutes from "./ml.routes.js";
import settingsRoutes from "./settings.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/ingredients", ingredientRoutes);
router.use("/categories", categoryRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/recipes", recipeRoutes);
router.use("/meal-plans", mealplanRoutes);
router.use("/shopping-lists", shoppingRoutes);
router.use("/notifications", notifRoutes);
router.use("/reports", reportRoutes);
router.use("/market", marketRoutes);
router.use("/marketplace", marketRoutes);
router.use("/ml", mlRoutes);
router.use("/settings", settingsRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
