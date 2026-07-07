import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware, RoleMiddleware } from "../middleware/role.middleware.js";
import multer from "multer";

const router = Router();
const auth = [AuthMiddleware, ActiveMiddleware, RoleMiddleware("User")];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 } });

router.get ("/export", ...auth, InventoryController.exportInventory);
router.post ("/import", ...auth, upload.single("file"), InventoryController.importInventory);
router.get ("/expiring", ...auth, InventoryController.getExpiring);
router.get ("/", ...auth, InventoryController.getAll);
router.get ("/:id", ...auth, InventoryController.getById);
router.post ("/", ...auth, InventoryController.create);
router.put ("/:id", ...auth, InventoryController.update);
router.delete("/:id", ...auth, InventoryController.delete);

export default router;
