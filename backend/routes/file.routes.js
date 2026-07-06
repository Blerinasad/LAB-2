import { Router } from "express";
import multer from "multer";
import { FileController } from "../controllers/file.controller.js";
import { AuthMiddleware } from "../middleware/auth.middleware.js";
import { ActiveMiddleware } from "../middleware/active.middleware.js"

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const auth = [AuthMiddleware, ActiveMiddleware];

router.post("/upload", ...auth, upload.single("file"), FileController.upload);
router.get("/:id", ...auth, FileController.getById);
router.delete("/:id", ...auth, FileController.delete);

export default router;
