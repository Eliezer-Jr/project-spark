import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";

function assertFrogConfigured() {
  if (!env.frog.apiKey || !env.frog.username || !env.frog.senderId) {
    throw new AppError(
      "Frog SMS is not configured. Set FROG_API_KEY, FROG_USERNAME and FROG_SENDER_ID.",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
}

function normalizeDestination(phone) {
  const normalized = String(phone || "").replace(/\s+/g, "");
  if (!normalized) {
    throw new AppError("SMS destination phone number is required.", HTTP_STATUS.BAD_REQUEST);
  }

  return normalized;
}

function createMessageId() {
  return `sms-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function postToFrog(path, payload) {
  assertFrogConfigured();

  const response = await fetch(`${env.frog.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": env.frog.apiKey,
      USERNAME: env.frog.username,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AppError(
      data?.message || "Frog SMS request failed.",
      response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      data,
    );
  }

  return data;
}

export const smsService = {
  async sendSms({ to, message, senderId = env.frog.senderId, messageId = createMessageId() }) {
    if (!message?.trim()) {
      throw new AppError("SMS message is required.", HTTP_STATUS.BAD_REQUEST);
    }

    const payload = {
      senderid: senderId,
      destinations: [
        {
          destination: normalizeDestination(to),
          msgid: messageId,
        },
      ],
      message: message.trim(),
      smstype: "text",
    };

    const result = await postToFrog("/api/v3/sms/send", payload);
    return { provider: "frog", messageId, result };
  },

  async generateOtp({
    number,
    expiry = 5,
    length = 5,
    type = "NUMERIC",
    senderId = env.frog.senderId,
    messageTemplate = "Your %SERVICE% OTP is %OTPCODE%. It expires in %EXPIRY% minutes.",
  }) {
    const payload = {
      number: normalizeDestination(number),
      expiry: Number(expiry),
      length: Number(length),
      messagetemplate: messageTemplate,
      type,
      senderid: senderId,
    };

    const result = await postToFrog("/api/v3/sms/otp/generate", payload);
    return { provider: "frog", result };
  },

  async verifyOtp({ number, otpcode }) {
    if (!otpcode?.trim()) {
      throw new AppError("OTP code is required.", HTTP_STATUS.BAD_REQUEST);
    }

    const result = await postToFrog("/api/v3/sms/otp/verify", {
      number: normalizeDestination(number),
      otpcode: otpcode.trim(),
    });

    return { provider: "frog", result };
  },
};
