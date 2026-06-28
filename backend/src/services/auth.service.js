import { APP_ROLES } from "../constraints/app.constraints.js";
import { AppError } from "../exceptions/AppError.js";
import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { userModel } from "../models/user.model.js";
import { sendWelcomeEmail } from "../mail/mailer.js";
import { createId } from "../utils/id.js";
import { hashPassword } from "../utils/password.js";
import { createAccessToken } from "../utils/token.js";
import { smsService } from "./sms.service.js";

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    isActive: Boolean(safeUser.isActive),
  };
}

function normalizePhone(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+233")) return compact;
  if (compact.startsWith("233")) return `+${compact}`;
  if (compact.startsWith("0")) return `+233${compact.slice(1)}`;
  if (/^\d{9}$/.test(compact)) return `+233${compact}`;

  return compact;
}

function createPlaceholderEmail(phone) {
  const safePhone = normalizePhone(phone).replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `${safePhone || createId()}@phone.artisancrm.local`;
}

export const authService = {
  async requestOtp({ phone, purpose = "login" }) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      throw new AppError("Phone number is required.", HTTP_STATUS.BAD_REQUEST);
    }

    if (!["login", "signup"].includes(purpose)) {
      throw new AppError("OTP purpose must be login or signup.", HTTP_STATUS.BAD_REQUEST);
    }

    const existingUser = await userModel.findByPhone(normalizedPhone);
    if (purpose === "login" && !existingUser) {
      throw new AppError(MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (purpose === "signup" && existingUser) {
      throw new AppError(MESSAGES.USER_EXISTS, HTTP_STATUS.CONFLICT);
    }

    return smsService.generateOtp({
      number: normalizedPhone,
      messageTemplate: "Your %SERVICE% sign-in code is %OTPCODE%. It expires in %EXPIRY% minutes.",
    });
  },

  async login({ phone, otpcode }) {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !otpcode?.trim()) {
      throw new AppError("Phone number and OTP code are required.", HTTP_STATUS.BAD_REQUEST);
    }

    const user = await userModel.findByPhone(normalizedPhone);

    if (!user) {
      throw new AppError(MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.USER_DEACTIVATED, HTTP_STATUS.UNAUTHORIZED);
    }

    await smsService.verifyOtp({ number: normalizedPhone, otpcode });

    return {
      token: createAccessToken(user),
      user: sanitizeUser(user),
    };
  },

  async signup({
    phone,
    otpcode,
    fullName,
    email,
    role = "customer",
    location,
    specialization,
    bio,
  }) {
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email?.trim()?.toLowerCase() || null;
    if (!normalizedPhone || !otpcode?.trim() || !fullName?.trim()) {
      throw new AppError("Full name, phone number and OTP code are required.", HTTP_STATUS.BAD_REQUEST);
    }

    const existingUser = await userModel.findByPhone(normalizedPhone);
    if (existingUser) {
      throw new AppError(MESSAGES.USER_EXISTS, HTTP_STATUS.CONFLICT);
    }

    if (normalizedEmail) {
      const existingEmailUser = await userModel.findByEmail(normalizedEmail);
      if (existingEmailUser) {
        throw new AppError(MESSAGES.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    if (!APP_ROLES.includes(role)) {
      throw new AppError("Invalid role selected.", HTTP_STATUS.BAD_REQUEST);
    }

    await smsService.verifyOtp({ number: normalizedPhone, otpcode });

    const timestamp = new Date().toISOString();
    const user = await userModel.create({
      id: createId(),
      email: normalizedEmail || createPlaceholderEmail(normalizedPhone),
      passwordHash: hashPassword(createId()),
      fullName: fullName.trim(),
      role,
      phone: normalizedPhone,
      location: location?.trim() || null,
      lastLatitude: null,
      lastLongitude: null,
      lastLocationAt: null,
      specialization: role === "artisan" ? specialization?.trim() || null : null,
      bio: bio?.trim() || null,
      avatarUrl: null,
      notifyEmail: true,
      notifySms: true,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (user.email && !user.email.endsWith("@phone.artisancrm.local")) {
      await sendWelcomeEmail(user);
    }

    return {
      token: createAccessToken(user),
      user: sanitizeUser(user),
    };
  },
};
