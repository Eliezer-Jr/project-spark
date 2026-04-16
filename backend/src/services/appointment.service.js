import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { appointmentModel } from "../models/appointment.model.js";
import { sortBy } from "../utils/sort.js";

export const appointmentService = {
  async getAppointments(filters = {}) {
    const appointments = await appointmentModel.findAll();
    let filtered = appointments;

    if (filters.artisanId) {
      filtered = filtered.filter((item) => item.artisanId === filters.artisanId);
    }

    if (filters.customerUserId) {
      filtered = filtered.filter((item) => item.customerUserId === filters.customerUserId);
    }

    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    return sortBy(filtered, "scheduledDate", filters.sort || "desc");
  },

  async createAppointment(payload) {
    if (!payload.artisanId || !payload.title?.trim() || !payload.scheduledDate || !payload.scheduledTime) {
      throw new AppError("Artisan, title, scheduled date and scheduled time are required.", HTTP_STATUS.BAD_REQUEST);
    }

    return appointmentModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      customerId: payload.customerId || null,
      customerUserId: payload.customerUserId || null,
      categoryId: payload.categoryId || null,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      scheduledDate: payload.scheduledDate,
      scheduledTime: payload.scheduledTime,
      status: payload.status || "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateAppointment(id, payload) {
    const updated = await appointmentModel.updateById(id, {
      ...payload,
      title: payload.title?.trim() || payload.title,
      description: typeof payload.description === "string" ? payload.description.trim() || null : payload.description,
    });

    if (!updated) {
      throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return updated;
  },

  async deleteAppointment(id) {
    const removed = await appointmentModel.deleteById(id);
    if (!removed) {
      throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return removed;
  },
};
