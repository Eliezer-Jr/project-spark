import { env } from "../config/env.js";
import { HTTP_STATUS } from "../constants/http-status.js";
import { MESSAGES } from "../constants/messages.js";
import { testConnection } from "../database/mysql.js";
import { sendResponse } from "../utils/api-response.js";

export async function getHealth(_req, res) {
  const databaseConnected = await testConnection().catch(() => false);

  return sendResponse(res, HTTP_STATUS.OK, MESSAGES.HEALTH_OK, {
    app: env.appName,
    environment: env.nodeEnv,
    databaseConnected,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
