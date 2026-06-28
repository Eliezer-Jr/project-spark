import { HTTP_STATUS } from "../constants/http-status.js";
import { messageService } from "../services/message.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function getConversation(req, res) {
  const conversation = await messageService.getConversation(
    req.auth.userId,
    req.auth.role,
    req.params.participantId,
    req.query.appointmentId || null,
  );
  return sendResponse(res, HTTP_STATUS.OK, "Conversation fetched successfully.", conversation);
}

export async function sendMessage(req, res) {
  const message = await messageService.sendMessage(
    req.auth.userId,
    req.auth.role,
    req.body.recipientId,
    req.body.body,
    req.body.appointmentId || null,
  );
  return sendResponse(res, HTTP_STATUS.CREATED, "Message sent successfully.", message);
}
