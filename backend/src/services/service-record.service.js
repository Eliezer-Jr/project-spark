import { AppError } from "../exceptions/AppError.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { SERVICE_RECORD_STATUSES } from "../constraints/app.constraints.js";
import { createId } from "../utils/id.js";
import { serviceRecordModel } from "../models/service-record.model.js";
import { domainService } from "./domain.service.js";
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

    await domainService.ensureArtisanExists(payload.artisanId);
    await domainService.ensureCustomerBelongsToArtisan(payload.customerId, payload.artisanId);
    await domainService.ensureCategoryExists(payload.categoryId);

    const cost =
      payload.cost === undefined ? existing.cost : payload.cost == null || payload.cost === "" ? null : Number(payload.cost);
    if (cost != null && (Number.isNaN(cost) || cost < 0)) {
      throw new AppError("Service cost must be a non-negative number.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    const status = payload.status || "completed";
    if (!SERVICE_RECORD_STATUSES.includes(status)) {
      throw new AppError("Invalid service record status.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    return serviceRecordModel.create({
      id: createId(),
      artisanId: payload.artisanId,
      customerId: payload.customerId,
      categoryId: payload.categoryId || null,
      description: payload.description.trim(),
      cost,
      status,
      serviceDate: payload.serviceDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  async updateServiceRecord(id, payload) {
    const existing = await serviceRecordModel.findById(id);
    if (!existing) {
      throw new AppError(MESSAGES.SERVICE_RECORD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const artisanId = payload.artisanId || existing.artisanId;
    const customerId = payload.customerId || existing.customerId;
    const status = payload.status || existing.status;
    const cost = payload.cost == null || payload.cost === "" ? null : Number(payload.cost);

    await domainService.ensureArtisanExists(artisanId);
    await domainService.ensureCustomerBelongsToArtisan(customerId, artisanId);
    await domainService.ensureCategoryExists(payload.categoryId === undefined ? existing.categoryId : payload.categoryId);

    if (cost != null && (Number.isNaN(cost) || cost < 0)) {
      throw new AppError("Service cost must be a non-negative number.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (!SERVICE_RECORD_STATUSES.includes(status)) {
      throw new AppError("Invalid service record status.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    const updated = await serviceRecordModel.updateById(id, {
      ...payload,
      artisanId,
      customerId,
      description: payload.description?.trim() || payload.description,
      cost: payload.cost === undefined ? undefined : cost,
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
