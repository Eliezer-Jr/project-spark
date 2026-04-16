import { closePool, testConnection } from "../database/mysql.js";

try {
  const ok = await testConnection();
  console.log(ok ? "Database connection successful." : "Database connection failed.");
} finally {
  await closePool();
}
