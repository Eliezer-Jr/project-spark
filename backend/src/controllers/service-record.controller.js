import { HTTP_STATUS } from "../constants/http-status.js";
import { sendResponse } from "../utils/api-response.js";
import { serviceRecordService } from "../services/service-record.service.js";

export async function getServiceRecords(req, res) {
  const records = await serviceRecordService.getServiceRecords(req.query);
  return sendResponse(res, HTTP_STATUS.OK, "Service records fetched successfully.", records);
}

export async function createServiceRecord(req, res) {
  const record = await serviceRecordService.createServiceRecord(req.body);
  return sendResponse(res, HTTP_STATUS.CREATED, "Service record created successfully.", record);
}

export async function updateServiceRecord(req, res) {
  const record = await serviceRecordService.updateServiceRecord(req.params.id, req.body);
  return sendResponse(res, HTTP_STATUS.OK, "Service record updated successfully.", record);
}

export async function deleteServiceRecord(req, res) {
  const record = await serviceRecordService.deleteServiceRecord(req.params.id);
  return sendResponse(res, HTTP_STATUS.OK, "Service record deleted successfully.", record);
}
