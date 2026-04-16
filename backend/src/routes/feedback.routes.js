import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { createFeedback, deleteFeedback, getFeedback, updateFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.get("/", asyncHandler(getFeedback));
router.post("/", asyncHandler(createFeedback));
router.patch("/:id", asyncHandler(updateFeedback));
router.delete("/:id", asyncHandler(deleteFeedback));

export default router;
