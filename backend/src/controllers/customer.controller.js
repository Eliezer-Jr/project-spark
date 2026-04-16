import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { customerModel } from "../models/customer.model.js";
import { customerService } from "../services/customer.service.js";
import { sendResponse } from "../utils/api-response.js";
import { paginate } from "../utils/pagination.js";

export async function getCustomers(req, res) {
  const filters = { ...req.query };

  if (req.auth.role === "artisan") {
    filters.artisanId = req.auth.userId;
  }

  const customers = await customerService.getCustomers(filters);
  const result = paginate(customers, req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Customers fetched successfully.", result.data, result.meta);
}

export async function createCustomer(req, res) {
  const payload = {
    ...req.body,
    artisanId: req.auth.role === "artisan" ? req.auth.userId : req.body.artisanId,
  };
  const customer = await customerService.createCustomer(payload);
  return sendResponse(res, HTTP_STATUS.CREATED, "Customer created successfully.", customer);
}

export async function updateCustomer(req, res) {
  const existing = await customerModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const payload = {
    ...req.body,
    artisanId: req.auth.role === "artisan" ? req.auth.userId : req.body.artisanId,
  };
  const customer = await customerService.updateCustomer(req.params.id, payload);
  return sendResponse(res, HTTP_STATUS.OK, "Customer updated successfully.", customer);
}

export async function deleteCustomer(req, res) {
  const existing = await customerModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const customer = await customerService.deleteCustomer(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Customer deleted successfully.", customer);
}
