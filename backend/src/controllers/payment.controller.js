import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { paymentModel } from "../models/payment.model.js";
import { reddePaymentService } from "../services/redde-payment.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function startQuotePayment(req, res) {
  const customerUserId = req.auth.userId;
  const payment = await reddePaymentService.startQuotePayment({
    quoteId: req.body.quoteId,
    artisanId: req.body.artisanId,
    customerUserId,
    amount: req.body.amount,
    phone: req.body.phone,
    paymentOption: req.body.paymentOption,
    note: req.body.note,
  });

  return sendResponse(res, HTTP_STATUS.CREATED, "Payment request created successfully.", payment);
}

export async function getPayments(req, res) {
  const payments = await paymentModel.findAll();

  if (req.auth.role === "admin") {
    return sendResponse(res, HTTP_STATUS.OK, "Payments fetched successfully.", payments);
  }

  if (req.auth.role === "artisan") {
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Payments fetched successfully.",
      payments.filter((payment) => payment.artisanId === req.auth.userId),
    );
  }

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    "Payments fetched successfully.",
    payments.filter((payment) => payment.customerUserId === req.auth.userId),
  );
}

export async function updatePaymentStatus(req, res) {
  if (!["pending", "successful", "failed"].includes(req.body.status)) {
    throw new AppError("A valid payment status is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const payment = await paymentModel.updateById(req.params.id, {
    status: req.body.status,
    note: req.body.note,
  });
  if (!payment) {
    throw new AppError("Payment not found.", HTTP_STATUS.NOT_FOUND);
  }

  return sendResponse(res, HTTP_STATUS.OK, "Payment updated successfully.", payment);
}

export async function handleReddeCallback(req, res) {
  const payment = await reddePaymentService.updateFromCallback(req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Payment callback processed successfully.", payment);
}
