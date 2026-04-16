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

async function maybeBaselineInitialMigration(connection, filename, applied) {
  if (applied.has(filename) || filename !== "001_create_core_tables.sql") {
    return;
  }

  const requiredTables = ["users", "service_categories", "customers", "service_records", "appointments", "feedback"];
  const existing = await Promise.all(requiredTables.map((table) => tableExists(connection, table)));

  if (existing.every(Boolean)) {
    await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
    applied.add(filename);
    console.log(`Baselined existing migration: ${filename}`);
  }
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

    if (!applied.has(filename)) {
      await applyMigration(connection, filename);
    }
  }

  console.log("Migrations complete.");
} finally {
  await connection.end();
}
