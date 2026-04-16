import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getAdminActivity,
  getAdminAnalytics,
  getAdminDashboard,
  getArtisanDashboard,
  getCustomerDashboard,
} from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/admin", asyncHandler(getAdminDashboard));
router.get("/admin/analytics", asyncHandler(getAdminAnalytics));
router.get("/admin/activity", asyncHandler(getAdminActivity));
router.get("/artisan/:artisanId", asyncHandler(getArtisanDashboard));
router.get("/customer/:customerUserId", asyncHandler(getCustomerDashboard));

export default router;
