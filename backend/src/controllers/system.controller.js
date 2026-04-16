import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { APP_ROLES, APPOINTMENT_STATUSES, SERVICE_RECORD_STATUSES } from "../constraints/app.constraints.js";
import { sendResponse } from "../utils/api-response.js";

export async function getSystemBootstrap(_req, res) {
  return sendResponse(res, HTTP_STATUS.OK, "System bootstrap fetched successfully.", {
    appName: env.appName,
    environment: env.nodeEnv,
    apiVersion: "v1",
    roles: APP_ROLES,
    appointmentStatuses: APPOINTMENT_STATUSES,
    serviceRecordStatuses: SERVICE_RECORD_STATUSES,
    features: {
      auth: true,
      dashboards: true,
      serviceCategories: true,
      customers: true,
      serviceRecords: true,
      appointments: true,
      feedback: true,
    },
  });
}
