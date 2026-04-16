import { HTTP_STATUS } from "../constants/http-status.js";

export function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error.",
    details: error.details || null,
  });
}
