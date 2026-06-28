import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateProfileUpdate, validateUserStatusUpdate } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getCurrentUser,
  getArtisans,
  getUser,
  getUsers,
  updateCurrentUserProfile,
  updateUserProfile,
  updateUserStatus,
} from "../controllers/user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", asyncHandler(getCurrentUser));
router.patch("/me/profile", validateProfileUpdate, asyncHandler(updateCurrentUserProfile));
router.get("/artisans", requireRoles("admin", "artisan", "customer"), asyncHandler(getArtisans));
router.get("/", requireRoles("admin"), asyncHandler(getUsers));
router.get("/:id", requireRoles("admin"), asyncHandler(getUser));
router.patch("/:id/status", requireRoles("admin"), validateUserStatusUpdate, asyncHandler(updateUserStatus));
router.patch("/:id/profile", requireRoles("admin", "artisan", "customer"), validateProfileUpdate, asyncHandler(updateUserProfile));

export default router;
