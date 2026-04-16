import { HTTP_STATUS } from "../constants/http-status.js";

export function notFoundMiddleware(req, res) {
  return res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}
