import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createServiceRecord,
  deleteServiceRecord,
  getServiceRecords,
  updateServiceRecord,
} from "../controllers/service-record.controller.js";

const router = Router();

router.get("/", asyncHandler(getServiceRecords));
router.post("/", asyncHandler(createServiceRecord));
router.patch("/:id", asyncHandler(updateServiceRecord));
router.delete("/:id", asyncHandler(deleteServiceRecord));

export default router;
