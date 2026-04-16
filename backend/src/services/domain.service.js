import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { AppError } from "../exceptions/AppError.js";
import { appointmentModel } from "../models/appointment.model.js";
import { customerModel } from "../models/customer.model.js";
import { feedbackModel } from "../models/feedback.model.js";
import { serviceCategoryModel } from "../models/service-category.model.js";
import { userModel } from "../models/user.model.js";

function ensure(condition, message, status = HTTP_STATUS.UNPROCESSABLE_ENTITY) {
  if (!condition) {
    throw new AppError(message, status);
  }
}

export const domainService = {
  async ensureArtisanExists(artisanId) {
    const artisan = await userModel.findById(artisanId);
    if (!artisan || artisan.role !== "artisan" || !artisan.isActive) {
      throw new AppError(MESSAGES.ARTISAN_REQUIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    return artisan;
  },

  async ensureCustomerUserExists(customerUserId) {
    const customerUser = await userModel.findById(customerUserId);
    if (!customerUser || customerUser.role !== "customer" || !customerUser.isActive) {
      throw new AppError(MESSAGES.CUSTOMER_USER_REQUIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    return customerUser;
  },

  async ensureCategoryExists(categoryId) {
    if (!categoryId) {
      return null;
    }

    const category = await serviceCategoryModel.findById(categoryId);
    if (!category) {
      throw new AppError(MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    return category;
  },

  async ensureCustomerBelongsToArtisan(customerId, artisanId) {
    const customer = await customerModel.findById(customerId);
    if (!customer) {
      throw new AppError(MESSAGES.CUSTOMER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    ensure(customer.artisanId === artisanId, "The selected customer does not belong to this artisan.");
    return customer;
  },

  async ensureAppointmentSlotAvailable({ artisanId, scheduledDate, scheduledTime, excludeAppointmentId = null }) {
    const appointments = await appointmentModel.findAll();
    const conflicting = appointments.find(
      (appointment) =>
        appointment.id !== excludeAppointmentId &&
        appointment.artisanId === artisanId &&
        appointment.scheduledDate === scheduledDate &&
        appointment.scheduledTime === scheduledTime &&
        ["pending", "confirmed"].includes(appointment.status),
    );

    if (conflicting) {
      throw new AppError(MESSAGES.APPOINTMENT_SLOT_TAKEN, HTTP_STATUS.CONFLICT);
    }
  },

  async ensureFeedbackAppointment({ appointmentId, artisanId, customerUserId }) {
    if (!appointmentId) {
      return null;
    }

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
      throw new AppError(MESSAGES.APPOINTMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    ensure(appointment.artisanId === artisanId, "The appointment does not belong to the selected artisan.");
    ensure(
      !customerUserId || appointment.customerUserId === customerUserId,
      "The appointment does not belong to the selected customer.",
    );
    ensure(appointment.status === "completed", MESSAGES.COMPLETED_APPOINTMENT_REQUIRED);

    return appointment;
  },

  async ensureFeedbackNotDuplicated({ appointmentId, customerUserId, excludeFeedbackId = null }) {
    if (!appointmentId) {
      return;
    }

    const feedback = await feedbackModel.findAll();
    const duplicate = feedback.find(
      (item) =>
        item.id !== excludeFeedbackId &&
        item.appointmentId === appointmentId &&
        item.customerUserId === customerUserId,
    );

    if (duplicate) {
      throw new AppError(MESSAGES.FEEDBACK_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
    }
  },
};
