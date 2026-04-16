import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateCategory, validateCategoryPatch } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createServiceCategory,
  deleteServiceCategory,
  getServiceCategories,
  updateServiceCategory,
} from "../controllers/service-category.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", requireRoles("admin", "artisan", "customer"), asyncHandler(getServiceCategories));
router.post("/", requireRoles("admin"), validateCategory, asyncHandler(createServiceCategory));
router.patch("/:id", requireRoles("admin"), validateCategoryPatch, asyncHandler(updateServiceCategory));
router.delete("/:id", requireRoles("admin"), asyncHandler(deleteServiceCategory));

export default router;
