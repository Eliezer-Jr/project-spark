import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { quoteModel } from "../models/quote.model.js";
import { quoteService } from "../services/quote.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function getQuotes(req, res) {
  const filters = {};
  if (req.auth.role === "artisan") filters.artisanId = req.auth.userId;
  if (req.auth.role === "customer") filters.customerUserId = req.auth.userId;
  return sendResponse(res, HTTP_STATUS.OK, "Quotes fetched successfully.", await quoteService.getQuotes(filters));
}

export async function createQuote(req, res) {
  const payload = { ...req.body, artisanId: req.auth.userId };
  const quote = await quoteService.createQuote(payload);
  return sendResponse(res, HTTP_STATUS.CREATED, "Quote sent successfully.", quote);
}

export async function updateQuote(req, res) {
  const existing = await quoteModel.findById(req.params.id);
  if (!existing) throw new AppError("Quote not found.", HTTP_STATUS.NOT_FOUND);
  const ownsQuote =
    req.auth.role === "admin" ||
    (req.auth.role === "artisan" && existing.artisanId === req.auth.userId) ||
    (req.auth.role === "customer" && existing.customerUserId === req.auth.userId);
  if (!ownsQuote) throw new AppError("Access denied.", HTTP_STATUS.FORBIDDEN);

  const patch = { ...req.body };
  if (req.auth.role === "customer") {
    const allowed = ["approved", "changes_requested"];
    if (patch.status && !allowed.includes(patch.status)) {
      throw new AppError("Customers can only approve or request changes.", HTTP_STATUS.FORBIDDEN);
    }
    Object.keys(patch).forEach((key) => {
      if (!["status", "requestedChanges"].includes(key)) delete patch[key];
    });
  }
  return sendResponse(res, HTTP_STATUS.OK, "Quote updated successfully.", await quoteService.updateQuote(req.params.id, patch));
}
