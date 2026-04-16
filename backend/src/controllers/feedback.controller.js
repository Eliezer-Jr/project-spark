import { HTTP_STATUS } from "../constants/http-status.js";
import { sendResponse } from "../utils/api-response.js";
import { feedbackService } from "../services/feedback.service.js";

export async function getFeedback(req, res) {
  const feedback = await feedbackService.getFeedback(req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback fetched successfully.", feedback);
}

export async function createFeedback(req, res) {
  const feedback = await feedbackService.createFeedback(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Feedback created successfully.", feedback);
}

export async function updateFeedback(req, res) {
  const feedback = await feedbackService.updateFeedback(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback updated successfully.", feedback);
}

export async function deleteFeedback(req, res) {
  const feedback = await feedbackService.deleteFeedback(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Feedback deleted successfully.", feedback);
}
