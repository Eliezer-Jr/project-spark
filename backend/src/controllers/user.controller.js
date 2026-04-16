import { HTTP_STATUS } from "../constants/http-status.js";
import { sendResponse } from "../utils/api-response.js";
import { userService } from "../services/user.service.js";

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
  return sendResponse(res, HTTP_STATUS.OK, "Users fetched successfully.", users);
}

export async function getUser(req, res) {
  const user = await userService.getUserById(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "User fetched successfully.", user);
}

export async function updateUserStatus(req, res) {
  const user = await userService.updateUserStatus(req.params.id, toBoolean(req.body.isActive));
  return sendResponse(res, HTTP_STATUS.OK, "User status updated successfully.", user);
}

export async function updateUserProfile(req, res) {
  const user = await userService.updateUserProfile(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "User profile updated successfully.", user);
}
