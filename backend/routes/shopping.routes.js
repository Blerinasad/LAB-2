import { Router } from "express";
import { ShoppingListController } from "../controllers/shopping-list.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("User")];

router.get ("/suggestions", ...auth, ShoppingListController.suggestions);
router.get ("/:id/export", ...auth, ShoppingListController.exportShoppingList);
router.get ("/", ...auth, ShoppingListController.getAll);
router.get ("/:id", ...auth, ShoppingListController.getById);
router.post ("/", ...auth, ShoppingListController.create);
router.patch ("/:id/status", ...auth, ShoppingListController.updateStatus);
router.delete("/:id", ...auth, ShoppingListController.delete);
router.post ("/:id/items", ...auth, ShoppingListController.addItem);
router.patch ("/:id/items/:itemId/purchase", ...auth, ShoppingListController.markPurchased);
router.delete("/:id/items/:itemId", ...auth, ShoppingListController.deleteItem);

export default router;
