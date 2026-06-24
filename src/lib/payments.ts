import { db } from "@/lib/app-db";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const AUTH_TOKEN_KEY = "artisancrm.auth-token";

export interface StartQuotePaymentInput {
  quoteId: string;
  artisanId: string;
  customerUserId: string;
  amount: number;
  phone: string;
  paymentOption?: string;
  note?: string | null;
}

export interface QuotePaymentResult {
  paymentId: string;
  status: "pending" | "successful" | "failed";
  checkoutUrl: string | null;
  providerReference: string | null;
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function startQuotePayment(input: StartQuotePaymentInput): Promise<QuotePaymentResult> {
  const token = getAuthToken();

  if (token) {
    const response = await fetch(`${API_BASE_URL}/payments/redde/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quoteId: input.quoteId,
        artisanId: input.artisanId,
        amount: input.amount,
        phone: input.phone,
        paymentOption: input.paymentOption,
        note: input.note,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      const detailMessage =
        payload?.details?.reddeMessage ||
        payload?.details?.message ||
        payload?.message ||
        "Unable to start Redde payment.";
      throw new Error(detailMessage);
    }

    const data = payload?.data;
    return {
      paymentId: data.id,
      status: data.status,
      checkoutUrl: data.checkoutUrl ?? null,
      providerReference: data.providerReference ?? null,
    };
  }

  const reference = `local-redde-${Date.now()}`;
  const { data } = await db.from("payments").insert({
    quote_id: input.quoteId,
    artisan_id: input.artisanId,
    customer_user_id: input.customerUserId,
    amount: input.amount,
    currency: "GHS",
    phone: input.phone,
    provider_reference: reference,
    checkout_url: null,
    status: "pending",
    note: input.note ?? "Awaiting Redde confirmation",
  });

  const payment = data[0];
  return {
    paymentId: payment.id,
    status: payment.status,
    checkoutUrl: payment.checkout_url,
    providerReference: payment.provider_reference,
  };
}
