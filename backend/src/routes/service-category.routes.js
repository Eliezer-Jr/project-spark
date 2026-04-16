import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createServiceCategory,
  deleteServiceCategory,
  getServiceCategories,
  updateServiceCategory,
} from "../controllers/service-category.controller.js";

const router = Router();

router.get("/", asyncHandler(getServiceCategories));
router.post("/", asyncHandler(createServiceCategory));
router.patch("/:id", asyncHandler(updateServiceCategory));
router.delete("/:id", asyncHandler(deleteServiceCategory));

export default router;
