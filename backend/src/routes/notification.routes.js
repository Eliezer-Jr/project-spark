import { Router } from "express";
import {
  generateSmsOtp,
  sendNotificationEmail,
  sendSms,
  verifySmsOtp,
} from "../controllers/notification.controller.js";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.use(authenticate);

router.post("/sms", requireRoles("admin", "artisan"), asyncHandler(sendSms));
router.post("/sms/otp/generate", requireRoles("admin"), asyncHandler(generateSmsOtp));
router.post("/sms/otp/verify", requireRoles("admin"), asyncHandler(verifySmsOtp));
router.post("/email", requireRoles("admin", "artisan"), asyncHandler(sendNotificationEmail));

export default router;
