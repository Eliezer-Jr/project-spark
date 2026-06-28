import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { messageModel } from "../models/message.model.js";
import { appointmentModel } from "../models/appointment.model.js";
import { userModel } from "../models/user.model.js";
import { createId } from "../utils/id.js";

function publicProfile(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    location: user.location,
    specialization: user.specialization,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

async function ensureParticipant(currentUserId, currentRole, participantId) {
  if (currentUserId === participantId) {
    throw new AppError("You cannot start a conversation with yourself.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }

  const participant = await userModel.findById(participantId);
  if (!participant || !participant.isActive) {
    throw new AppError("The selected contact is unavailable.", HTTP_STATUS.NOT_FOUND);
  }

  const allowed =
    currentRole === "admin" ||
    (currentRole === "customer" && participant.role === "artisan") ||
    (currentRole === "artisan" && participant.role === "customer");
  if (!allowed) {
    throw new AppError("You cannot contact this user.", HTTP_STATUS.FORBIDDEN);
  }
  return participant;
}

async function ensureAppointmentThread(currentUserId, participantId, appointmentId) {
  if (!appointmentId) return null;
  const appointment = await appointmentModel.findById(appointmentId);
  if (!appointment) {
    throw new AppError("Appointment not found.", HTTP_STATUS.NOT_FOUND);
  }
  const participants = [appointment.artisanId, appointment.customerUserId];
  if (!participants.includes(currentUserId) || !participants.includes(participantId)) {
    throw new AppError("You cannot access this appointment conversation.", HTTP_STATUS.FORBIDDEN);
  }
  return appointment;
}

export const messageService = {
  async getConversation(currentUserId, currentRole, participantId, appointmentId = null) {
    const participant = await ensureParticipant(currentUserId, currentRole, participantId);
    await ensureAppointmentThread(currentUserId, participantId, appointmentId);
    await messageModel.markConversationRead(currentUserId, participantId, appointmentId);
    const messages = await messageModel.findConversation(currentUserId, participantId, appointmentId);
    return { participant: publicProfile(participant), messages };
  },

  async sendMessage(currentUserId, currentRole, participantId, body, appointmentId = null) {
    await ensureParticipant(currentUserId, currentRole, participantId);
    await ensureAppointmentThread(currentUserId, participantId, appointmentId);
    return messageModel.create({
      id: createId(),
      senderId: currentUserId,
      recipientId: participantId,
      appointmentId,
      body: body.trim(),
    });
  },
};
