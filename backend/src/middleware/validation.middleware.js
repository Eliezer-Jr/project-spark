import { HTTP_STATUS } from "../constants/http-status.js";
import {
  APP_ROLES,
  APPOINTMENT_STATUSES,
  JOURNEY_STATUSES,
  SERVICE_RECORD_STATUSES,
} from "../constraints/app.constraints.js";
import { AppError } from "../exceptions/AppError.js";

function isEmpty(value) {
  return value == null || (typeof value === "string" && !value.trim());
}

function isProvided(value) {
  return value !== undefined;
}

function ensure(condition, message) {
  if (!condition) {
    throw new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

function ensureEmail(value, message) {
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()), message);
}

function ensurePhone(value, message) {
  ensure(/^\+?\d{9,15}$/.test(String(value).replace(/\s+/g, "")), message);
}

function ensureDate(value, message) {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(String(value)), message);
}

function ensureTime(value, message) {
  ensure(/^\d{2}:\d{2}(:\d{2})?$/.test(String(value)), message);
}

function ensureEnum(value, values, message) {
  ensure(values.includes(value), message);
}

function ensureNonNegativeNumber(value, message) {
  ensure(!Number.isNaN(Number(value)) && Number(value) >= 0, message);
}

function ensureBodyNotEmpty(body, message = "At least one field must be provided.") {
  ensure(Object.keys(body || {}).length > 0, message);
}

export function validateLogin(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.phone), "Phone number is required.");
    ensurePhone(req.body.phone, "Phone number must contain numbers only.");
    ensure(!isEmpty(req.body.otpcode), "OTP code is required.");
    ensure(/^\d{5}$/.test(String(req.body.otpcode)), "OTP code must contain 5 numbers.");
    next();
  } catch (error) {
    next(error);
  }
}

export function validateOtpRequest(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.phone), "Phone number is required.");
    ensurePhone(req.body.phone, "Phone number must contain numbers only.");
    if (isProvided(req.body.purpose)) {
      ensureEnum(req.body.purpose, ["login", "signup"], "OTP purpose must be login or signup.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateSignup(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.fullName), "Full name is required.");
    ensure(!isEmpty(req.body.phone), "Phone number is required.");
    ensurePhone(req.body.phone, "Phone number must contain numbers only.");
    ensure(!isEmpty(req.body.otpcode), "OTP code is required.");
    ensure(/^\d{5}$/.test(String(req.body.otpcode)), "OTP code must contain 5 numbers.");
    ensure(!isEmpty(req.body.location), "Location is required.");
    if (isProvided(req.body.email) && !isEmpty(req.body.email)) {
      ensureEmail(req.body.email, "A valid email address is required.");
    }
    if (isProvided(req.body.role)) {
      ensureEnum(req.body.role, APP_ROLES, "Role must be admin, artisan or customer.");
    }
    if (req.body.role === "artisan") {
      const requiredFields = {
        gender: "Gender",
        dateOfBirth: "Date of birth",
        avatarUrl: "Profile photo",
        businessName: "Business or workshop name",
        artisanCategory: "Artisan category",
        specialization: "Specific skill or service",
        yearsExperience: "Years of experience",
        address: "Location or address",
        region: "Region",
        city: "City or town",
        digitalAddress: "Digital address",
        idType: "ID type",
        idNumber: "ID number",
        idCardUrl: "ID card upload",
        bio: "Service description",
        priceRange: "Price range",
        availability: "Availability",
        workingHours: "Working hours",
        whatsappNumber: "WhatsApp number",
        emergencyContactName: "Emergency contact name",
        emergencyContactPhone: "Emergency contact phone",
        paymentAccountName: "Bank or MoMo account name",
        momoNumber: "MoMo number",
        preferredPaymentMethod: "Preferred payment method",
      };
      for (const [field, label] of Object.entries(requiredFields)) {
        ensure(!isEmpty(req.body[field]), `${label} is required.`);
      }
      ensureDate(req.body.dateOfBirth, "Date of birth must be a valid date.");
      ensureNonNegativeNumber(
        req.body.yearsExperience,
        "Years of experience must be zero or more.",
      );
      for (const field of ["whatsappNumber", "emergencyContactPhone", "momoNumber"]) {
        ensurePhone(req.body[field], `${field} must be a valid phone number.`);
      }
      ensure(
        Array.isArray(req.body.workingDays) && req.body.workingDays.length > 0,
        "Select at least one working day.",
      );
      ensure(
        Array.isArray(req.body.portfolioUrls) && req.body.portfolioUrls.length > 0,
        "Upload at least one portfolio photo.",
      );
      ensure(req.body.portfolioUrls.length <= 5, "Upload no more than 5 portfolio photos.");
      for (const image of [req.body.avatarUrl, req.body.idCardUrl, ...req.body.portfolioUrls]) {
        ensure(
          /^data:image\/[a-z0-9.+-]+;base64,/i.test(image),
          "Uploads must be valid image files.",
        );
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCategory(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.name), "Category name is required.");
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCategoryPatch(req, _res, next) {
  try {
    ensureBodyNotEmpty(req.body);
    if (isProvided(req.body.name)) {
      ensure(!isEmpty(req.body.name), "Category name is required.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCustomer(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.name), "Customer name is required.");
    if (isProvided(req.body.email) && !isEmpty(req.body.email)) {
      ensureEmail(req.body.email, "A valid customer email is required.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateCustomerPatch(req, _res, next) {
  try {
    ensureBodyNotEmpty(req.body);
    if (isProvided(req.body.name)) {
      ensure(!isEmpty(req.body.name), "Customer name is required.");
    }
    if (isProvided(req.body.email) && !isEmpty(req.body.email)) {
      ensureEmail(req.body.email, "A valid customer email is required.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateServiceRecord(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.customerId), "Customer is required.");
    ensure(!isEmpty(req.body.description), "Service description is required.");
    ensure(!isEmpty(req.body.serviceDate), "Service date is required.");
    ensureDate(req.body.serviceDate, "Service date must be in YYYY-MM-DD format.");
    if (isProvided(req.body.cost) && !isEmpty(req.body.cost)) {
      ensureNonNegativeNumber(req.body.cost, "Service cost must be a non-negative number.");
    }
    if (isProvided(req.body.status)) {
      ensureEnum(req.body.status, SERVICE_RECORD_STATUSES, "Invalid service record status.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateServiceRecordPatch(req, _res, next) {
  try {
    ensureBodyNotEmpty(req.body);
    if (isProvided(req.body.customerId)) {
      ensure(!isEmpty(req.body.customerId), "Customer is required.");
    }
    if (isProvided(req.body.description)) {
      ensure(!isEmpty(req.body.description), "Service description is required.");
    }
    if (isProvided(req.body.serviceDate)) {
      ensure(!isEmpty(req.body.serviceDate), "Service date is required.");
      ensureDate(req.body.serviceDate, "Service date must be in YYYY-MM-DD format.");
    }
    if (isProvided(req.body.cost) && !isEmpty(req.body.cost)) {
      ensureNonNegativeNumber(req.body.cost, "Service cost must be a non-negative number.");
    }
    if (isProvided(req.body.status)) {
      ensureEnum(req.body.status, SERVICE_RECORD_STATUSES, "Invalid service record status.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateAppointment(req, _res, next) {
  try {
    ensure(!isEmpty(req.body.title), "Appointment title is required.");
    ensure(!isEmpty(req.body.scheduledDate), "Scheduled date is required.");
    ensure(!isEmpty(req.body.scheduledTime), "Scheduled time is required.");
    ensureDate(req.body.scheduledDate, "Scheduled date must be in YYYY-MM-DD format.");
    ensureTime(req.body.scheduledTime, "Scheduled time must be in HH:MM or HH:MM:SS format.");
    if (isProvided(req.body.status)) {
      ensureEnum(req.body.status, APPOINTMENT_STATUSES, "Invalid appointment status.");
    }
    if (isProvided(req.body.journeyStatus)) {
      ensureEnum(req.body.journeyStatus, JOURNEY_STATUSES, "Invalid journey status.");
    }
    for (const field of ["artisanLocationSharing", "customerLocationSharing"]) {
      if (isProvided(req.body[field])) {
        ensure(typeof req.body[field] === "boolean", `${field} must be a boolean value.`);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateAppointmentPatch(req, _res, next) {
  try {
    ensureBodyNotEmpty(req.body);
    if (isProvided(req.body.title)) {
      ensure(!isEmpty(req.body.title), "Appointment title is required.");
    }
    if (isProvided(req.body.scheduledDate)) {
      ensure(!isEmpty(req.body.scheduledDate), "Scheduled date is required.");
      ensureDate(req.body.scheduledDate, "Scheduled date must be in YYYY-MM-DD format.");
    }
    if (isProvided(req.body.scheduledTime)) {
      ensure(!isEmpty(req.body.scheduledTime), "Scheduled time is required.");
      ensureTime(req.body.scheduledTime, "Scheduled time must be in HH:MM or HH:MM:SS format.");
    }
    if (isProvided(req.body.status)) {
      ensureEnum(req.body.status, APPOINTMENT_STATUSES, "Invalid appointment status.");
    }
    if (isProvided(req.body.journeyStatus)) {
      ensureEnum(req.body.journeyStatus, JOURNEY_STATUSES, "Invalid journey status.");
    }
    for (const field of ["artisanLocationSharing", "customerLocationSharing"]) {
      if (isProvided(req.body[field])) {
        ensure(typeof req.body[field] === "boolean", `${field} must be a boolean value.`);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateFeedback(req, _res, next) {
  try {
    const rating = Number(req.body.rating);
    ensure(!Number.isNaN(rating), "Rating is required.");
    ensure(rating >= 1 && rating <= 5, "Rating must be between 1 and 5.");
    next();
  } catch (error) {
    next(error);
  }
}

export function validateFeedbackPatch(req, _res, next) {
  try {
    ensureBodyNotEmpty(req.body);
    if (isProvided(req.body.rating)) {
      const rating = Number(req.body.rating);
      ensure(!Number.isNaN(rating), "Rating is required.");
      ensure(rating >= 1 && rating <= 5, "Rating must be between 1 and 5.");
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateProfileUpdate(req, _res, next) {
  try {
    const allowedFields = [
      "fullName",
      "phone",
      "location",
      "lastLatitude",
      "lastLongitude",
      "lastLocationAt",
      "specialization",
      "bio",
      "avatarUrl",
      "notifyEmail",
      "notifySms",
    ];
    const hasKnownField = Object.keys(req.body || {}).some((field) =>
      allowedFields.includes(field),
    );
    ensure(hasKnownField, "At least one valid profile field must be provided.");
    if (isProvided(req.body.notifyEmail)) {
      ensure(typeof req.body.notifyEmail === "boolean", "notifyEmail must be a boolean value.");
    }
    if (isProvided(req.body.notifySms)) {
      ensure(typeof req.body.notifySms === "boolean", "notifySms must be a boolean value.");
    }
    if (isProvided(req.body.lastLatitude)) {
      ensure(
        Number.isFinite(Number(req.body.lastLatitude)) &&
          Number(req.body.lastLatitude) >= -90 &&
          Number(req.body.lastLatitude) <= 90,
        "lastLatitude must be between -90 and 90.",
      );
    }
    if (isProvided(req.body.lastLongitude)) {
      ensure(
        Number.isFinite(Number(req.body.lastLongitude)) &&
          Number(req.body.lastLongitude) >= -180 &&
          Number(req.body.lastLongitude) <= 180,
        "lastLongitude must be between -180 and 180.",
      );
    }
    if (isProvided(req.body.lastLocationAt) && req.body.lastLocationAt !== null) {
      ensure(
        !Number.isNaN(Date.parse(req.body.lastLocationAt)),
        "lastLocationAt must be a valid date and time.",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateUserStatusUpdate(req, _res, next) {
  try {
    ensure(typeof req.body?.isActive === "boolean", "isActive must be a boolean value.");
    next();
  } catch (error) {
    next(error);
  }
}

export function validateMessage(req, _res, next) {
  try {
    ensure(!isEmpty(req.body?.recipientId), "Message recipient is required.");
    ensure(!isEmpty(req.body?.body), "Message cannot be empty.");
    ensure(
      String(req.body.body).trim().length <= 2000,
      "Message must be 2,000 characters or less.",
    );
    if (isProvided(req.body.appointmentId)) {
      ensure(!isEmpty(req.body.appointmentId), "Appointment is required for this conversation.");
    }
    next();
  } catch (error) {
    next(error);
  }
}
