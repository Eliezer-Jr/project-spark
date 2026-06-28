import { Router } from "express";
import { getConversation, sendMessage } from "../controllers/message.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateMessage } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authenticate, requireRoles("admin", "artisan", "customer"));
router.get("/:participantId", asyncHandler(getConversation));
router.post("/", validateMessage, asyncHandler(sendMessage));

export default router;
