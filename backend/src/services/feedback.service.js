import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { feedbackModel } from "../models/feedback.model.js";
import { sortBy } from "../utils/sort.js";

export const feedbackService = {
  async getFeedback(filters = {}) {
    const feedback = await feedbackModel.findAll();
    let filtered = feedback;

    if (filters.artisanId) {
      filtered = filtered.filter((item) => item.artisanId === filters.artisanId);
    }

    if (filters.customerUserId) {
      filtered = filtered.filter((item) => item.customerUserId === filters.customerUserId);
    }

    return sortBy(filtered, "createdAt", "desc");
  },

  async createFeedback(payload) {
    if (!payload.artisanId || !payload.customerUserId || !payload.rating) {
      throw new AppError("Artisan, customer user and rating are required.", HTTP_STATUS.BAD_REQUEST);
    }

    const rating = Number(payload.rating);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      throw new AppError("Rating must be between 1 and 5.", HTTP_STATUS.BAD_REQUEST);
    }

    return feedbackModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      customerUserId: payload.customerUserId,
      appointmentId: payload.appointmentId || null,
      rating,
      comment: payload.comment?.trim() || null,
      createdAt: new Date().toISOString(),
    });
  },

  async updateFeedback(id, payload) {
    const updated = await feedbackModel.updateById(id, {
      ...payload,
      comment: typeof payload.comment === "string" ? payload.comment.trim() || null : payload.comment,
    });

    if (!updated) {
      throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return updated;
  },

  async deleteFeedback(id) {
    const removed = await feedbackModel.deleteById(id);
    if (!removed) {
      throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return removed;
  },
};
