import { HTTP_STATUS } from "../constants/http-status.js";
import { authService } from "../services/auth.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function login(req, res) {
  const result = await authService.login(req.body.email, req.body.password);
  return sendResponse(res, HTTP_STATUS.OK, "Login successful.", result);
}

export async function signup(req, res) {
  const result = await authService.signup(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Account created successfully.", result);
}
