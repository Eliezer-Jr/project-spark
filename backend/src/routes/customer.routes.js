import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth.middleware.js";
import { validateCustomer, validateCustomerPatch } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../controllers/customer.controller.js";

const router = Router();

router.use(authenticate, requireRoles("admin", "artisan"));

router.get("/", asyncHandler(getCustomers));
router.post("/", validateCustomer, asyncHandler(createCustomer));
router.patch("/:id", validateCustomerPatch, asyncHandler(updateCustomer));
router.delete("/:id", asyncHandler(deleteCustomer));

export default router;
