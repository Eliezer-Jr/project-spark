import { HTTP_STATUS } from "../constants/http-status.js";
import { appointmentService } from "../services/appointment.service.js";
import { sendResponse } from "../utils/api-response.js";

export async function getAppointments(req, res) {
  const appointments = await appointmentService.getAppointments(req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Appointments fetched successfully.", appointments);
}

export async function createAppointment(req, res) {
  const appointment = await appointmentService.createAppointment(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Appointment created successfully.", appointment);
}

export async function updateAppointment(req, res) {
  const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Appointment updated successfully.", appointment);
}

export async function deleteAppointment(req, res) {
  const appointment = await appointmentService.deleteAppointment(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Appointment deleted successfully.", appointment);
}
