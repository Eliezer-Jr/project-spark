import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const migrationsDir = path.join(backendRoot, "database", "migrations");

function createConnection(database) {
  const config = {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true,
  };

  if (database) {
    config.database = database;
  }

  return mysql.createConnection(config);
}

async function ensureDatabase() {
  const connection = await createConnection();
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``);
  } finally {
    await connection.end();
  }
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query("SELECT filename FROM schema_migrations");
  return new Set(rows.map((row) => row.filename));
}

async function getMigrationFiles() {
  const files = await fs.readdir(migrationsDir);
  return files.filter((file) => file.endsWith(".sql")).sort();
}

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
      LIMIT 1
    `,
    [env.dbName, tableName],
  );
  return rows.length > 0;
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ? AND column_name = ?
      LIMIT 1
    `,
    [env.dbName, tableName, columnName],
  );
  return rows.length > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ? AND index_name = ?
      LIMIT 1
    `,
    [env.dbName, tableName, indexName],
  );
  return rows.length > 0;
}

async function migrationAlreadyPresent(connection, filename) {
  switch (filename) {
    case "002_add_notification_preferences.sql":
      return (
        (await columnExists(connection, "users", "notify_email")) &&
        (await columnExists(connection, "users", "notify_sms"))
      );
    case "003_make_user_phone_unique.sql":
      return indexExists(connection, "users", "idx_users_phone_unique");
    case "004_create_payments.sql":
      return tableExists(connection, "payments");
    case "005_add_user_last_location.sql":
      return (
        (await columnExists(connection, "users", "last_latitude")) &&
        (await columnExists(connection, "users", "last_longitude")) &&
        (await columnExists(connection, "users", "last_location_at"))
      );
    case "006_add_appointment_live_tracking.sql":
      return (
        (await columnExists(connection, "appointments", "journey_status")) &&
        (await columnExists(connection, "appointments", "artisan_location_sharing")) &&
        (await columnExists(connection, "appointments", "customer_location_sharing"))
      );
    case "007_create_messages.sql":
      return tableExists(connection, "messages");
    case "008_scope_messages_to_appointments.sql":
      return columnExists(connection, "messages", "appointment_id");
    case "009_create_quotes.sql":
      return tableExists(connection, "quotes");
    default:
      return false;
  }
}

async function maybeBaselineInitialMigration(connection, filename, applied) {
  if (applied.has(filename) || filename !== "001_create_core_tables.sql") {
    return;
  }

  const requiredTables = [
    "users",
    "service_categories",
    "customers",
    "service_records",
    "appointments",
    "feedback",
  ];
  const existing = await Promise.all(requiredTables.map((table) => tableExists(connection, table)));

  if (existing.every(Boolean)) {
    await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
    applied.add(filename);
    console.log(`Baselined existing migration: ${filename}`);
  }
}

async function maybeBaselineExistingMigration(connection, filename, applied) {
  if (applied.has(filename) || !(await migrationAlreadyPresent(connection, filename))) return;

  await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
  applied.add(filename);
  console.log(`Baselined existing migration: ${filename}`);
}

async function applyMigration(connection, filename) {
  const filePath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(filePath, "utf8");

  await connection.beginTransaction();
  try {
    await connection.query(sql);
    await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
    await connection.commit();
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

await ensureDatabase();

const connection = await createConnection(env.dbName);

try {
  await ensureMigrationsTable(connection);
  const applied = await getAppliedMigrations(connection);
  const files = await getMigrationFiles();

  for (const filename of files) {
    await maybeBaselineInitialMigration(connection, filename, applied);
    await maybeBaselineExistingMigration(connection, filename, applied);

    if (!applied.has(filename)) {
      await applyMigration(connection, filename);
    }
  }

  console.log("Migrations complete.");
} finally {
  await connection.end();
}
