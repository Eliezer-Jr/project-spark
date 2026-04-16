import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateAppointment, validateAppointmentPatch } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} from "../controllers/appointment.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requireRoles("admin", "artisan", "customer"), asyncHandler(getAppointments));
router.post("/", requireRoles("admin", "artisan", "customer"), validateAppointment, asyncHandler(createAppointment));
router.patch("/:id", requireRoles("admin", "artisan", "customer"), validateAppointmentPatch, asyncHandler(updateAppointment));
router.delete("/:id", requireRoles("admin", "artisan", "customer"), asyncHandler(deleteAppointment));

export default router;
