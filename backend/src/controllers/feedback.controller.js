import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { feedbackModel } from "../models/feedback.model.js";
import { sendResponse } from "../utils/api-response.js";
import { feedbackService } from "../services/feedback.service.js";
import { paginate } from "../utils/pagination.js";

export async function getFeedback(req, res) {
  const filters = { ...req.query };

  if (req.auth.role === "artisan") {
    filters.artisanId = req.auth.userId;
  }

  if (req.auth.role === "customer") {
    filters.customerUserId = req.auth.userId;
  }

  const feedback = await feedbackService.getFeedback(filters);
  const result = paginate(feedback, req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback fetched successfully.", result.data, result.meta);
}

export async function getPublicFeedback(_req, res) {
  const feedback = await feedbackService.getFeedback();
  return sendResponse(res, HTTP_STATUS.OK, "Public feedback fetched successfully.", feedback);
}

export async function createFeedback(req, res) {
  const payload = {
    ...req.body,
    customerUserId: req.auth.role === "customer" ? req.auth.userId : req.body.customerUserId,
  };
  const feedback = await feedbackService.createFeedback(payload);
  return sendResponse(res, HTTP_STATUS.CREATED, "Feedback created successfully.", feedback);
}

export async function updateFeedback(req, res) {
  const existing = await feedbackModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "customer" && existing.customerUserId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const payload = {
    ...req.body,
    artisanId: req.auth.role === "customer" ? existing.artisanId : req.body.artisanId,
    appointmentId: req.auth.role === "customer" ? existing.appointmentId : req.body.appointmentId,
    customerUserId: req.auth.role === "customer" ? req.auth.userId : req.body.customerUserId,
  };
  const feedback = await feedbackService.updateFeedback(req.params.id, payload);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback updated successfully.", feedback);
}

export async function deleteFeedback(req, res) {
  const existing = await feedbackModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.FEEDBACK_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "customer" && existing.customerUserId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const feedback = await feedbackService.deleteFeedback(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback deleted successfully.", feedback);
}
