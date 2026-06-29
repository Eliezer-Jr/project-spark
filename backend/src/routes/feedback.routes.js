import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateFeedback, validateFeedbackPatch } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createFeedback, deleteFeedback, getFeedback, getPublicFeedback, updateFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requireRoles("admin", "artisan", "customer"), asyncHandler(getFeedback));
router.get("/public", requireRoles("admin", "artisan", "customer"), asyncHandler(getPublicFeedback));
router.post("/", requireRoles("admin", "customer"), validateFeedback, asyncHandler(createFeedback));
router.patch("/:id", requireRoles("admin", "customer"), validateFeedbackPatch, asyncHandler(updateFeedback));
router.delete("/:id", requireRoles("admin", "customer"), asyncHandler(deleteFeedback));

export default router;
