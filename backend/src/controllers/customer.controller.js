import { HTTP_STATUS } from "../constants/http-status.js";
import { customerService } from "../services/customer.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function getCustomers(req, res) {
  const customers = await customerService.getCustomers(req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Customers fetched successfully.", customers);
}

export async function createCustomer(req, res) {
  const customer = await customerService.createCustomer(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Customer created successfully.", customer);
}

export async function updateCustomer(req, res) {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Customer updated successfully.", customer);
}

export async function deleteCustomer(req, res) {
  const customer = await customerService.deleteCustomer(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Customer deleted successfully.", customer);
}
