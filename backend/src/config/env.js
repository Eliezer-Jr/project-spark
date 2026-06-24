import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(backendRoot, ".env") });

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  frontendUrls: (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  appName: process.env.APP_NAME || "Project Spark Backend",
  appSecret: process.env.APP_SECRET || "change-me-in-production",
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || "artisan_crm",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  frog: {
    baseUrl: process.env.FROG_BASE_URL || "https://frogapi.wigal.com.gh",
    apiKey: process.env.FROG_API_KEY || "",
    username: process.env.FROG_USERNAME || "",
    senderId: process.env.FROG_SENDER_ID || "",
  },
  redde: {
    baseUrl: process.env.REDDE_BASE_URL || "https://api.reddeonline.com/v1",
    apiKey: process.env.REDDE_API_KEY || "",
    appId: process.env.REDDE_APP_ID || "",
    callbackUrl: process.env.REDDE_CALLBACK_URL || "",
  },
  email: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.MAIL_FROM || process.env.SMTP_USER || "",
  },
  backendRoot,
};
