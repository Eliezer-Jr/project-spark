import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { createId } from "../utils/id.js";
import { serviceRecordModel } from "../models/service-record.model.js";
import { sortBy } from "../utils/sort.js";

export const serviceRecordService = {
  async getServiceRecords(filters = {}) {
    const records = await serviceRecordModel.findAll();
    let filtered = records;

    if (filters.artisanId) {
      filtered = filtered.filter((item) => item.artisanId === filters.artisanId);
    }

    if (filters.customerId) {
      filtered = filtered.filter((item) => item.customerId === filters.customerId);
    }

    return sortBy(filtered, "serviceDate", "desc");
  },

  async createServiceRecord(payload) {
    if (!payload.artisanId || !payload.customerId || !payload.description?.trim() || !payload.serviceDate) {
      throw new AppError("Artisan, customer, description and service date are required.", HTTP_STATUS.BAD_REQUEST);
    }

    return serviceRecordModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      customerId: payload.customerId,
      categoryId: payload.categoryId || null,
      description: payload.description.trim(),
      cost: payload.cost == null || payload.cost === "" ? null : Number(payload.cost),
      status: payload.status || "completed",
      serviceDate: payload.serviceDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateServiceRecord(id, payload) {
    const updated = await serviceRecordModel.updateById(id, {
      ...payload,
      description: payload.description?.trim() || payload.description,
      cost: payload.cost == null || payload.cost === "" ? null : Number(payload.cost),
    });

    if (!updated) {
      throw new AppError(MESSAGES.SERVICE_RECORD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return updated;
  },

  async deleteServiceRecord(id) {
    const removed = await serviceRecordModel.deleteById(id);
    if (!removed) {
      throw new AppError(MESSAGES.SERVICE_RECORD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return removed;
  },
};
