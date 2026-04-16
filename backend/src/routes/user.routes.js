import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { getUser, getUsers, updateUserProfile, updateUserStatus } from "../controllers/user.controller.js";

const router = Router();

router.get("/", asyncHandler(getUsers));
router.get("/:id", asyncHandler(getUser));
router.patch("/:id/status", asyncHandler(updateUserStatus));
router.patch("/:id/profile", asyncHandler(updateUserProfile));

export default router;
