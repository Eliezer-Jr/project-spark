import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateServiceRecord, validateServiceRecordPatch } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createServiceRecord,
  deleteServiceRecord,
  getServiceRecords,
  updateServiceRecord,
} from "../controllers/service-record.controller.js";

const router = Router();

router.use(authenticate, requireRoles("admin", "artisan"));

router.get("/", asyncHandler(getServiceRecords));
router.post("/", validateServiceRecord, asyncHandler(createServiceRecord));
router.patch("/:id", validateServiceRecordPatch, asyncHandler(updateServiceRecord));
router.delete("/:id", asyncHandler(deleteServiceRecord));

export default router;
