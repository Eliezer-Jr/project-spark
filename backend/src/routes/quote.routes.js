import { Router } from "express";
import { createQuote, getQuotes, updateQuote } from "../controllers/quote.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(authenticate);
router.get("/", requireRoles("admin", "artisan", "customer"), asyncHandler(getQuotes));
router.post("/", requireRoles("admin", "artisan"), asyncHandler(createQuote));
router.patch("/:id", requireRoles("admin", "artisan", "customer"), asyncHandler(updateQuote));
export default router;
