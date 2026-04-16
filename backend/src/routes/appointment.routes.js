import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  updateAppointment,
} from "../controllers/appointment.controller.js";

const router = Router();

router.get("/", asyncHandler(getAppointments));
router.post("/", asyncHandler(createAppointment));
router.patch("/:id", asyncHandler(updateAppointment));
router.delete("/:id", asyncHandler(deleteAppointment));

export default router;
