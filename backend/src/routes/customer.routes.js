import { Router } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../controllers/customer.controller.js";

const router = Router();

router.get("/", asyncHandler(getCustomers));
router.post("/", asyncHandler(createCustomer));
router.patch("/:id", asyncHandler(updateCustomer));
router.delete("/:id", asyncHandler(deleteCustomer));

export default router;
