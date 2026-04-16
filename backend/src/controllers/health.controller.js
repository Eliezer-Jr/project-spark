import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { sendResponse } from "../utils/api-response.js";

export function getHealth(_req, res) {
  return sendResponse(res, HTTP_STATUS.OK, MESSAGES.HEALTH_OK, {
    timestamp: new Date().toISOString(),
  });
}
