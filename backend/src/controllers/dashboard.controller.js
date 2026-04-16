import { HTTP_STATUS } from "../constants/http-status.js";
import { dashboardService } from "../services/dashboard.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function getAdminDashboard(_req, res) {
  const stats = await dashboardService.getAdminDashboard();
  return sendResponse(res, HTTP_STATUS.OK, "Admin dashboard fetched successfully.", stats);
}

export async function getAdminAnalytics(_req, res) {
  const stats = await dashboardService.getAdminAnalytics();
  return sendResponse(res, HTTP_STATUS.OK, "Admin analytics fetched successfully.", stats);
}

export async function getAdminActivity(_req, res) {
  const activity = await dashboardService.getAdminActivity();
  return sendResponse(res, HTTP_STATUS.OK, "Admin activity fetched successfully.", activity);
}

export async function getArtisanDashboard(req, res) {
  const stats = await dashboardService.getArtisanDashboard(req.params.artisanId);
  return sendResponse(res, HTTP_STATUS.OK, "Artisan dashboard fetched successfully.", stats);
}

export async function getCustomerDashboard(req, res) {
  const stats = await dashboardService.getCustomerDashboard(req.params.customerUserId);
  return sendResponse(res, HTTP_STATUS.OK, "Customer dashboard fetched successfully.", stats);
}
