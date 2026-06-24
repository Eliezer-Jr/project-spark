import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";

const devOtpStore = new Map();
const DEV_OTP_CODE = "12345";

function canUseDevOtpFallback() {
  return env.nodeEnv === "development" && env.frog.devOtpFallback;
}

function assertFrogConfigured() {
  if (!env.frog.apiKey || !env.frog.username || !env.frog.senderId) {
    throw new AppError(
      "Frog SMS is not configured. Set FROG_API_KEY, FROG_USERNAME and FROG_SENDER_ID.",
      HTTP_STATUS.BAD_GATEWAY,
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

  let response;
  try {
    response = await fetch(`${env.frog.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API-KEY": env.frog.apiKey,
        USERNAME: env.frog.username,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AppError("Unable to reach Frog SMS provider.", HTTP_STATUS.BAD_GATEWAY, {
      provider: "frog",
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AppError(
      data?.message || "Frog SMS request failed.",
      response.status || HTTP_STATUS.BAD_GATEWAY,
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

    try {
      const result = await postToFrog("/api/v3/sms/otp/generate", payload);
      return { provider: "frog", result };
    } catch (error) {
      if (!canUseDevOtpFallback()) throw error;

      devOtpStore.set(payload.number, {
        code: DEV_OTP_CODE,
        expiresAt: Date.now() + Number(expiry) * 60 * 1000,
      });
      console.warn(`Frog OTP failed; using development OTP ${DEV_OTP_CODE} for ${payload.number}.`);
      return {
        provider: "local-dev",
        result: {
          message: "Development OTP fallback active.",
          otpcode: DEV_OTP_CODE,
          originalError: error instanceof Error ? error.message : "Frog SMS request failed.",
        },
      };
    }
  },

  async verifyOtp({ number, otpcode }) {
    if (!otpcode?.trim()) {
      throw new AppError("OTP code is required.", HTTP_STATUS.BAD_REQUEST);
    }

    const destination = normalizeDestination(number);
    const devOtp = devOtpStore.get(destination);
    if (devOtp) {
      if (Date.now() > devOtp.expiresAt) {
        devOtpStore.delete(destination);
        throw new AppError("Development OTP has expired. Request a new code.", HTTP_STATUS.UNAUTHORIZED);
      }

      if (otpcode.trim() !== devOtp.code) {
        throw new AppError("Invalid OTP code.", HTTP_STATUS.UNAUTHORIZED);
      }

      devOtpStore.delete(destination);
      return { provider: "local-dev", result: { verified: true } };
    }

    const result = await postToFrog("/api/v3/sms/otp/verify", {
      number: destination,
      otpcode: otpcode.trim(),
    });

    return { provider: "frog", result };
  },
};
