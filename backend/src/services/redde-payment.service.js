import crypto from "node:crypto";
import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { paymentModel } from "../models/payment.model.js";

function normalizePhone(phone) {
  const compact = String(phone || "").replace(/[^\d+]/g, "");
  if (!compact) return "";
  if (compact.startsWith("+233")) return compact;
  if (compact.startsWith("233")) return `+${compact}`;
  if (compact.startsWith("0")) return `+233${compact.slice(1)}`;
  if (/^\d{9}$/.test(compact)) return `+233${compact}`;
  return compact;
}

function assertReddeConfigured() {
  if (!env.redde.apiKey || !env.redde.appId) {
    throw new AppError("Redde payment credentials are not configured.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

function pickCheckoutUrl(payload) {
  return payload?.checkoutUrl || payload?.checkout_url || payload?.paymentUrl || payload?.payment_url || payload?.url || null;
}

function pickProviderReference(payload, fallback) {
  return payload?.transactionid || payload?.transactionId || payload?.clienttransid || payload?.clientReference || payload?.reference || fallback;
}

async function requestReddeCollection({ amount, phone, reference, note }) {
  assertReddeConfigured();

  const payload = {
    amount,
    appid: env.redde.appId,
    clientreference: reference,
    clienttransid: reference,
    currency: "GHS",
    description: note || "Project Spark payment",
    nickname: "Project Spark",
    paymentoption: "momo",
    walletnumber: phone,
    callback_url: env.redde.callbackUrl || undefined,
  };

  const response = await fetch(`${env.redde.baseUrl.replace(/\/$/, "")}/receive/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      APIKEY: env.redde.apiKey,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status === "error" || result?.success === false) {
    throw new AppError(result?.message || "Redde payment request failed.", HTTP_STATUS.BAD_REQUEST, result);
  }

  return result;
}

export const reddePaymentService = {
  async startQuotePayment({ quoteId, artisanId, customerUserId, amount, phone, note }) {
    const normalizedAmount = Number(amount);
    const normalizedPhone = normalizePhone(phone);

    if (!quoteId || !artisanId || !customerUserId) {
      throw new AppError("Quote, artisan, and customer are required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new AppError("A valid payment amount is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (!normalizedPhone) {
      throw new AppError("A valid mobile money number is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    const reference = `ps-${crypto.randomUUID()}`;
    const reddeResult = await requestReddeCollection({
      amount: normalizedAmount,
      phone: normalizedPhone,
      reference,
      note,
    });

    return paymentModel.create({
      id: crypto.randomUUID(),
      quoteId,
      artisanId,
      customerUserId,
      amount: normalizedAmount,
      currency: "GHS",
      phone: normalizedPhone,
      provider: "redde",
      providerReference: pickProviderReference(reddeResult, reference),
      checkoutUrl: pickCheckoutUrl(reddeResult),
      status: "pending",
      note: note || null,
    });
  },

  async updateFromCallback(payload = {}) {
    const reference = pickProviderReference(payload, null);
    if (!reference) {
      throw new AppError("Payment reference is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    const payment = await paymentModel.findByProviderReference(reference);
    if (!payment) {
      throw new AppError("Payment not found.", HTTP_STATUS.NOT_FOUND);
    }

    const rawStatus = String(payload.status || payload.transactionStatus || payload.state || "").toLowerCase();
    const status = ["success", "successful", "paid", "completed"].includes(rawStatus)
      ? "successful"
      : ["failed", "cancelled", "canceled", "declined"].includes(rawStatus)
        ? "failed"
        : "pending";

    return paymentModel.updateById(payment.id, { status, note: payload.message || payment.note });
  },
};
