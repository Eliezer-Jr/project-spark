export function sendResponse(res, statusCode, message, data = null, meta = null) {
  return res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    meta,
    requestId: res.locals.requestId || null,
  });
}
