import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_TRANSITIONS } from "../constraints/app.constraints.js";
import { createId } from "../utils/id.js";
import { appointmentModel } from "../models/appointment.model.js";
import { domainService } from "./domain.service.js";
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

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter((item) =>
        [item.title, item.description, item.scheduledDate].some((value) => value?.toLowerCase().includes(search)),
      );
    }

    return sortBy(filtered, "scheduledDate", filters.sort || "desc");
  },

  async createAppointment(payload) {
    if (!payload.artisanId || !payload.title?.trim() || !payload.scheduledDate || !payload.scheduledTime) {
      throw new AppError("Artisan, title, scheduled date and scheduled time are required.", HTTP_STATUS.BAD_REQUEST);
    }

    await domainService.ensureArtisanExists(payload.artisanId);
    await domainService.ensureCategoryExists(payload.categoryId);

    if (payload.customerId) {
      await domainService.ensureCustomerBelongsToArtisan(payload.customerId, payload.artisanId);
    }

    if (payload.customerUserId) {
      await domainService.ensureCustomerUserExists(payload.customerUserId);
    }

    const status = payload.status || "pending";
    if (!APPOINTMENT_STATUSES.includes(status)) {
      throw new AppError("Invalid appointment status.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    await domainService.ensureAppointmentSlotAvailable({
      artisanId: payload.artisanId,
      scheduledDate: payload.scheduledDate,
      scheduledTime: payload.scheduledTime,
    });

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
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateAppointment(id, payload) {
    const existing = await appointmentModel.findById(id);
    if (!existing) {
      throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const artisanId = payload.artisanId || existing.artisanId;
    const customerId = payload.customerId === undefined ? existing.customerId : payload.customerId;
    const customerUserId = payload.customerUserId === undefined ? existing.customerUserId : payload.customerUserId;
    const categoryId = payload.categoryId === undefined ? existing.categoryId : payload.categoryId;
    const nextStatus = payload.status || existing.status;
    const allowedStatuses = APPOINTMENT_STATUS_TRANSITIONS[existing.status] || [existing.status];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new AppError(MESSAGES.INVALID_STATUS_TRANSITION, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    await domainService.ensureArtisanExists(artisanId);
    await domainService.ensureCategoryExists(categoryId);

    if (customerId) {
      await domainService.ensureCustomerBelongsToArtisan(customerId, artisanId);
    }

    if (customerUserId) {
      await domainService.ensureCustomerUserExists(customerUserId);
    }

    const scheduledDate = payload.scheduledDate || existing.scheduledDate;
    const scheduledTime = payload.scheduledTime || existing.scheduledTime;

    await domainService.ensureAppointmentSlotAvailable({
      artisanId,
      scheduledDate,
      scheduledTime,
      excludeAppointmentId: id,
    });

    const updated = await appointmentModel.updateById(id, {
      ...payload,
      artisanId,
      customerId,
      customerUserId,
      categoryId,
      status: nextStatus,
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
