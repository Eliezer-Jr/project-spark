import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { appointmentModel } from "../models/appointment.model.js";
import { quoteModel } from "../models/quote.model.js";
import { createId } from "../utils/id.js";

const statuses = ["draft", "awaiting_response", "changes_requested", "approved", "converted", "archived"];

export const quoteService = {
  async getQuotes(filters = {}) {
    let rows = await quoteModel.findAll();
    if (filters.artisanId) rows = rows.filter((row) => row.artisanId === filters.artisanId);
    if (filters.customerUserId) rows = rows.filter((row) => row.customerUserId === filters.customerUserId);
    return rows;
  },

  async createQuote(payload) {
    if (!payload.customerUserId) throw new AppError("Customer is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    if (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) <= 0) {
      throw new AppError("A valid quote amount is required.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    if (payload.appointmentId) {
      const appointment = await appointmentModel.findById(payload.appointmentId);
      if (!appointment || appointment.artisanId !== payload.artisanId || appointment.customerUserId !== payload.customerUserId) {
        throw new AppError("Quote does not match this appointment.", HTTP_STATUS.FORBIDDEN);
      }
      const existing = (await quoteModel.findAll()).find((row) => row.appointmentId === payload.appointmentId);
      if (existing) throw new AppError("A quote has already been sent for this appointment.", HTTP_STATUS.CONFLICT);
    }
    return quoteModel.create({
      id: createId(),
      ...payload,
      amount: Number(payload.amount),
      depositAmount: payload.depositAmount == null ? null : Number(payload.depositAmount),
      status: statuses.includes(payload.status) ? payload.status : "draft",
    });
  },

  async updateQuote(id, patch) {
    const quote = await quoteModel.findById(id);
    if (!quote) throw new AppError("Quote not found.", HTTP_STATUS.NOT_FOUND);
    return quoteModel.updateById(id, patch);
  },
};
