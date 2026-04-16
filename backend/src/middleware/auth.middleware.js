import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { AppError } from "../exceptions/AppError.js";
import { userModel } from "../models/user.model.js";
import { verifyAccessToken } from "../utils/token.js";

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function authenticate(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    next(new AppError(MESSAGES.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload?.sub) {
    next(new AppError(MESSAGES.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  const user = await userModel.findById(payload.sub);
  if (!user || !user.isActive) {
    next(new AppError(MESSAGES.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  req.auth = {
    userId: user.id,
    role: user.role,
    email: user.email,
  };

  next();
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new AppError(MESSAGES.AUTH_REQUIRED, HTTP_STATUS.UNAUTHORIZED));
      return;
    }

    if (!roles.includes(req.auth.role)) {
      next(new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN));
      return;
    }

    next();
  };
}
