import app from "./app.js";
import { env } from "./config/env.js";
import { closePool } from "./database/mysql.js";

const server = app.listen(env.port, () => {
  console.log(`${env.appName} running on http://localhost:${env.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
