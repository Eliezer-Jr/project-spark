import { APP_ROLES } from "../constraints/app.constraints.js";
import { AppError } from "../exceptions/AppError.js";
import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { userModel } from "../models/user.model.js";
import { sendWelcomeEmail } from "../mail/mailer.js";
import { createId } from "../utils/id.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    isActive: Boolean(safeUser.isActive),
  };
}

function createAuthToken(user) {
  const payload = `${user.id}:${user.email}:${Date.now()}`;
  return Buffer.from(payload).toString("base64url");
}

export const authService = {
  async login(email, password) {
    if (!email?.trim() || !password) {
      throw new AppError("Email and password are required.", HTTP_STATUS.BAD_REQUEST);
    }

    const user = await userModel.findByEmail(email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AppError(MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.USER_DEACTIVATED, HTTP_STATUS.UNAUTHORIZED);
    }

    return {
      token: createAuthToken(user),
      user: sanitizeUser(user),
    };
  },

  async signup({ email, password, fullName, role = "customer" }) {
    if (!email?.trim() || !password || !fullName?.trim()) {
      throw new AppError("Full name, email and password are required.", HTTP_STATUS.BAD_REQUEST);
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new AppError(MESSAGES.USER_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (!APP_ROLES.includes(role)) {
      throw new AppError("Invalid role selected.", HTTP_STATUS.BAD_REQUEST);
    }

    const timestamp = new Date().toISOString();
    const user = await userModel.create({
      id: createId(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      role,
      phone: null,
      location: null,
      specialization: null,
      bio: null,
      avatarUrl: null,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await sendWelcomeEmail(user);

    return {
      token: createAuthToken(user),
      user: sanitizeUser(user),
    };
  },
};
