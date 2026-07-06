import { Router } from "express";
import { MarketplaceController } from "../controllers/marketplace.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js";
import { RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware];
const mgr = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Manager")];
const courier = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("Admin","Courier")];

router.get("/stores", ...auth, MarketplaceController.getStores);
router.get("/orders/my", ...auth, MarketplaceController.myOrders);
router.get("/orders/pending", ...mgr, MarketplaceController.pendingOrders);
router.get("/orders/assigned", ...courier, MarketplaceController.courierOrders);
router.get("/orders/store", ...mgr, MarketplaceController.storeOrders);
router.get("/orders/courier", ...courier, MarketplaceController.courierOrders);
router.get("/orders/spending", ...auth, MarketplaceController.spending);
router.get("/orders/forecast", ...auth, MarketplaceController.budgetForecast);
router.get("/orders/:id", ...auth, MarketplaceController.getOrderById);
router.post("/orders", ...auth, MarketplaceController.createOrder);
router.post("/orders/:id/rebuy", ...auth, MarketplaceController.rebuy);
router.post("/orders/:id/claim", ...courier, MarketplaceController.claimOrder);
router.patch("/orders/:id/approve", ...mgr, MarketplaceController.approveOrder);
router.patch("/orders/:id/reject", ...mgr, MarketplaceController.rejectOrder);
router.patch("/orders/:id/ready", ...mgr, MarketplaceController.readyOrder);
router.patch("/orders/:id/pickup", ...courier, MarketplaceController.pickupOrder);
router.patch("/orders/:id/deliver", ...courier, MarketplaceController.deliverOrder);
router.patch("/orders/:id/status", ...courier, MarketplaceController.updateOrderStatus);

export default router;
