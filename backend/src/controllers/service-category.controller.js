import { HTTP_STATUS } from "../constants/http-status.js";
import { sendResponse } from "../utils/api-response.js";
import { serviceCategoryService } from "../services/service-category.service.js";

export async function getServiceCategories(_req, res) {
  const categories = await serviceCategoryService.getCategories();
  return sendResponse(res, HTTP_STATUS.OK, "Service categories fetched successfully.", categories);
}

export async function createServiceCategory(req, res) {
  const category = await serviceCategoryService.createCategory(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Service category created successfully.", category);
}

export async function updateServiceCategory(req, res) {
  const category = await serviceCategoryService.updateCategory(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Service category updated successfully.", category);
}

export async function deleteServiceCategory(req, res) {
  const category = await serviceCategoryService.deleteCategory(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Service category deleted successfully.", category);
}
