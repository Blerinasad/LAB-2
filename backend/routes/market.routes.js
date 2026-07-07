import { Router } from "express";
import { MarketController } from "../controllers/market.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];
const mgr = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];
const courier = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Courier")];
const orderStatus = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager","Courier")];

router.get ("/stores", ...auth, MarketController.getStores);
router.get ("/orders/my", ...auth, MarketController.myOrders);
router.get ("/orders/store", ...mgr, MarketController.storeOrders);
router.get ("/orders/courier", ...courier, MarketController.courierOrders);
router.get ("/orders/spending", ...auth, MarketController.spending);
router.get ("/orders/forecast", ...auth, MarketController.budgetForecast);
router.get ("/orders/:id", ...auth, MarketController.getOrderById);
router.post("/orders", ...auth, MarketController.createOrder);
router.post("/orders/:id/rebuy", ...auth, MarketController.rebuy);
router.post("/orders/:id/claim", ...courier, MarketController.claimOrder);
router.patch("/orders/:id/status", ...orderStatus, MarketController.updateOrderStatus);

export default router;
