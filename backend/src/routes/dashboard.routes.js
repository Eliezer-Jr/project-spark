import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getAdminActivity,
  getAdminAnalytics,
  getAdminDashboard,
  getArtisanDashboard,
  getCurrentDashboard,
  getCustomerDashboard,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", asyncHandler(getCurrentDashboard));
router.get("/admin", requireRoles("admin"), asyncHandler(getAdminDashboard));
router.get("/admin/analytics", requireRoles("admin"), asyncHandler(getAdminAnalytics));
router.get("/admin/activity", requireRoles("admin"), asyncHandler(getAdminActivity));
router.get("/artisan/:artisanId", requireRoles("admin", "artisan"), asyncHandler(getArtisanDashboard));
router.get("/customer/:customerUserId", requireRoles("admin", "customer"), asyncHandler(getCustomerDashboard));

export default router;
