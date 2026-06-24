import { Router } from "express";
import { handleReddeCallback, getPayments, startQuotePayment, updatePaymentStatus } from "../controllers/payment.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post("/redde/callback", asyncHandler(handleReddeCallback));

router.use(authenticate);
router.get("/", requireRoles("admin", "artisan", "customer"), asyncHandler(getPayments));
router.post("/redde/quote", requireRoles("customer"), asyncHandler(startQuotePayment));
router.patch("/:id/status", requireRoles("admin"), asyncHandler(updatePaymentStatus));

export default router;
