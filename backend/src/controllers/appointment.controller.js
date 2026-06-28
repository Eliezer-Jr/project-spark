import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { appointmentModel } from "../models/appointment.model.js";
import { appointmentService } from "../services/appointment.service.js";
import { sendResponse } from "../utils/api-response.js";
import { paginate } from "../utils/pagination.js";
import { userService } from "../services/user.service.js";

export async function getAppointments(req, res) {
  const filters = { ...req.query };

  if (req.auth.role === "artisan") {
    filters.artisanId = req.auth.userId;
  }

  if (req.auth.role === "customer") {
    filters.customerUserId = req.auth.userId;
  }

  const appointments = await appointmentService.getAppointments(filters);
  const result = paginate(appointments, req.query);
  return sendResponse(
    res,
    HTTP_STATUS.OK,
    "Appointments fetched successfully.",
    result.data,
    result.meta,
  );
}

export async function createAppointment(req, res) {
  const payload = { ...req.body };

  if (req.auth.role === "artisan") {
    payload.artisanId = req.auth.userId;
  }

  if (req.auth.role === "customer") {
    payload.customerUserId = req.auth.userId;
    payload.status = "pending";
  }

  const appointment = await appointmentService.createAppointment(payload);
  return sendResponse(res, HTTP_STATUS.CREATED, "Appointment created successfully.", appointment);
}

export async function updateAppointment(req, res) {
  const existing = await appointmentModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  if (req.auth.role === "customer" && existing.customerUserId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const payload = { ...req.body };

  if (req.auth.role === "artisan") {
    payload.artisanId = req.auth.userId;
    delete payload.customerLocationSharing;
  }

  if (req.auth.role === "customer") {
    payload.artisanId = existing.artisanId;
    payload.customerUserId = req.auth.userId;

    if (payload.status && payload.status !== "cancelled") {
      throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
    }
    delete payload.artisanLocationSharing;
    delete payload.journeyStatus;
  }

  const appointment = await appointmentService.updateAppointment(req.params.id, payload);
  return sendResponse(res, HTTP_STATUS.OK, "Appointment updated successfully.", appointment);
}

export async function getAppointmentTracking(req, res) {
  const appointment = await appointmentModel.findById(req.params.id);
  if (!appointment) {
    throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  const isArtisan = req.auth.role === "artisan" && appointment.artisanId === req.auth.userId;
  const isCustomer = req.auth.role === "customer" && appointment.customerUserId === req.auth.userId;
  if (!isArtisan && !isCustomer && req.auth.role !== "admin") {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const [artisan, customer] = await Promise.all([
    userService.getUserById(appointment.artisanId),
    appointment.customerUserId ? userService.getUserById(appointment.customerUserId) : null,
  ]);

  const visibleParty = (party, sharing) =>
    party && {
      id: party.id,
      fullName: party.fullName,
      phone: party.phone,
      avatarUrl: party.avatarUrl,
      location: party.location,
      latitude: sharing ? party.lastLatitude : null,
      longitude: sharing ? party.lastLongitude : null,
      locationAt: sharing ? party.lastLocationAt : null,
      sharing: Boolean(sharing),
    };

  return sendResponse(res, HTTP_STATUS.OK, "Live tracking fetched successfully.", {
    appointmentId: appointment.id,
    journeyStatus: appointment.journeyStatus,
    artisan: visibleParty(artisan, appointment.artisanLocationSharing),
    customer: visibleParty(customer, appointment.customerLocationSharing),
  });
}

export async function deleteAppointment(req, res) {
  const existing = await appointmentModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }
  if (req.auth.role === "customer" && existing.customerUserId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const appointment = await appointmentService.deleteAppointment(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Appointment deleted successfully.", appointment);
}
