import { MESSAGES } from "../constants/messages.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { AppError } from "../exceptions/AppError.js";
import { serviceRecordModel } from "../models/service-record.model.js";
import { sendResponse } from "../utils/api-response.js";
import { serviceRecordService } from "../services/service-record.service.js";
import { paginate } from "../utils/pagination.js";

export async function getServiceRecords(req, res) {
  const filters = { ...req.query };

  if (req.auth.role === "artisan") {
    filters.artisanId = req.auth.userId;
  }

  const records = await serviceRecordService.getServiceRecords(filters);
  const result = paginate(records, req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Service records fetched successfully.", result.data, result.meta);
}

export async function createServiceRecord(req, res) {
  const payload = {
    ...req.body,
    artisanId: req.auth.role === "artisan" ? req.auth.userId : req.body.artisanId,
  };
  const record = await serviceRecordService.createServiceRecord(payload);
  return sendResponse(res, HTTP_STATUS.CREATED, "Service record created successfully.", record);
}

export async function updateServiceRecord(req, res) {
  const existing = await serviceRecordModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.SERVICE_RECORD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const payload = {
    ...req.body,
    artisanId: req.auth.role === "artisan" ? req.auth.userId : req.body.artisanId,
  };
  const record = await serviceRecordService.updateServiceRecord(req.params.id, payload);
  return sendResponse(res, HTTP_STATUS.OK, "Service record updated successfully.", record);
}

export async function deleteServiceRecord(req, res) {
  const existing = await serviceRecordModel.findById(req.params.id);
  if (!existing) {
    throw new AppError(MESSAGES.SERVICE_RECORD_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  if (req.auth.role === "artisan" && existing.artisanId !== req.auth.userId) {
    throw new AppError(MESSAGES.ACCESS_DENIED, HTTP_STATUS.FORBIDDEN);
  }

  const record = await serviceRecordService.deleteServiceRecord(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Service record deleted successfully.", record);
}
