import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { sendResponse } from "../utils/api-response.js";
import { userService } from "../services/user.service.js";
import { paginate } from "../utils/pagination.js";

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

export async function getUsers(req, res) {
  const filters = {
    ...req.query,
    isActive: typeof req.query.isActive === "string" ? toBoolean(req.query.isActive) : undefined,
  };
  const users = await userService.getAllUsers(filters);
  const result = paginate(users, req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Users fetched successfully.", result.data, result.meta);
}

export async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "User fetched successfully.", user);
}

export async function getCurrentUser(req, res) {
  const user = await userService.getUserById(req.auth.userId);
  return sendResponse(res, HTTP_STATUS.OK, "Current user fetched successfully.", user);
}

export async function getArtisans(_req, res) {
  const artisans = await userService.getAllUsers({ role: "artisan", isActive: true });
  return sendResponse(res, HTTP_STATUS.OK, "Artisans fetched successfully.", artisans);
}

export async function updateUserStatus(req, res) {
  const user = await userService.updateUserStatus(req.params.id, toBoolean(req.body.isActive));
  return sendResponse(res, HTTP_STATUS.OK, "User status updated successfully.", user);
}

export async function updateCurrentUserProfile(req, res) {
  const user = await userService.updateUserProfile(req.auth.userId, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Current user profile updated successfully.", user);
}

export async function updateUserProfile(req, res) {
  if (req.auth.role !== "admin" && req.auth.userId !== req.params.id) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const user = await userService.updateUserProfile(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "User profile updated successfully.", user);
}
