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

function toLocalWalletNumber(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.startsWith("+233")) return `0${normalized.slice(4)}`;
  if (normalized.startsWith("233")) return `0${normalized.slice(3)}`;
  return normalized;
}

function assertWalletMatchesNetwork(walletNumber, paymentOption) {
  const network = String(paymentOption || "").toUpperCase();
  const prefixes = {
    MTN: ["024", "025", "053", "054", "055", "059"],
    VODAFONE: ["020", "050"],
    AIRTELTIGO: ["026", "027", "056", "057"],
  };

  if (!/^0\d{9}$/.test(walletNumber)) {
    throw new AppError("Enter a valid Ghana mobile money number, for example 0241234567.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const allowedPrefixes = prefixes[network];
  if (allowedPrefixes && !allowedPrefixes.some((prefix) => walletNumber.startsWith(prefix))) {
    throw new AppError(`The wallet number does not match the selected ${network} network.`, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

function assertReddeConfigured() {
  if (!env.redde.apiKey || !env.redde.appId) {
    throw new AppError("Redde payment credentials are not configured.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
}

function pickCheckoutUrl(payload) {
  return (
    payload?.checkoutUrl ||
    payload?.checkouturl ||
    payload?.checkout_url ||
    payload?.paymentUrl ||
    payload?.paymenturl ||
    payload?.payment_url ||
    payload?.redirectUrl ||
    payload?.redirecturl ||
    payload?.redirect_url ||
    payload?.url ||
    null
  );
}

function pickProviderReference(payload, fallback) {
  return payload?.transactionid || payload?.transactionId || payload?.clienttransid || payload?.clientReference || payload?.reference || fallback;
}

function getReddeMessage(payload) {
  if (!payload) return "Redde payment request failed.";
  return (
    payload.message ||
    payload.msg ||
    payload.reason ||
    payload.responseMessage ||
    payload.statusMessage ||
    payload.error ||
    "Redde payment request failed."
  );
}

async function requestReddeCollection({ amount, phone, paymentOption, reference, note }) {
  assertReddeConfigured();

  const payload = {
    amount,
    appid: env.redde.appId,
    clientreference: reference,
    clienttransid: reference,
    currency: "GHS",
    description: note || "Project Spark payment",
    nickname: "Project Spark",
    paymentoption: paymentOption || env.redde.paymentOption,
    walletnumber: phone,
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
    throw new AppError(getReddeMessage(result), HTTP_STATUS.BAD_REQUEST, {
      statusCode: response.status,
      reddeStatus: result?.status || null,
      reddeMessage: getReddeMessage(result),
      reddeResponse: result,
    });
  }

  return result;
}

export const reddePaymentService = {
  async startQuotePayment({ quoteId, artisanId, customerUserId, amount, phone, paymentOption, note }) {
    const normalizedAmount = Number(amount);
    const normalizedPhone = normalizePhone(phone);
    const walletNumber = toLocalWalletNumber(phone);
    const selectedPaymentOption = paymentOption || env.redde.paymentOption;

    if (!quoteId || !artisanId || !customerUserId) {
      throw new AppError("Quote, artisan, and customer are required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new AppError("A valid payment amount is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (!normalizedPhone) {
      throw new AppError("A valid mobile money number is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    assertWalletMatchesNetwork(walletNumber, selectedPaymentOption);

    const reference = `ps-${crypto.randomUUID()}`;
    const reddeResult = await requestReddeCollection({
      amount: normalizedAmount,
      phone: walletNumber,
      paymentOption: selectedPaymentOption,
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
