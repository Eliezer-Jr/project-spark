import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { hashPassword } from "../utils/password.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const schemaFile = path.join(backendRoot, "database", "schema.sql");
const baseTimestamp = "2026-04-16T00:00:00.000Z";

const seedData = {
  users: [
    {
      id: "user-admin",
      email: "admin@artisancrm.local",
      passwordHash: hashPassword("password123"),
      fullName: "Admin User",
      role: "admin",
      phone: "+233 20 000 0000",
      location: "Accra",
      specialization: null,
      bio: "Platform administrator",
      avatarUrl: null,
      isActive: true,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
    },
    {
      id: "user-artisan",
      email: "artisan@artisancrm.local",
      passwordHash: hashPassword("password123"),
      fullName: "Kojo Mensah",
      role: "artisan",
      phone: "+233 24 123 4567",
      location: "Kumasi",
      specialization: "Electrical",
      bio: "Residential and small business electrical repairs.",
      avatarUrl: null,
      isActive: true,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
    },
    {
      id: "user-customer",
      email: "customer@artisancrm.local",
      passwordHash: hashPassword("password123"),
      fullName: "Ama Owusu",
      role: "customer",
      phone: "+233 55 987 6543",
      location: "Accra",
      specialization: null,
      bio: null,
      avatarUrl: null,
      isActive: true,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
    },
  ],
  serviceCategories: [
    {
      id: "category-electrical",
      name: "Electrical",
      description: "Wiring, sockets and repairs",
      icon: "bolt",
      createdAt: baseTimestamp,
    },
    {
      id: "category-plumbing",
      name: "Plumbing",
      description: "Leaks, fittings and pipe work",
      icon: "droplets",
      createdAt: baseTimestamp,
    },
    {
      id: "category-carpentry",
      name: "Carpentry",
      description: "Furniture and wood repairs",
      icon: "hammer",
      createdAt: baseTimestamp,
    },
  ],
  customers: [
    {
      id: "customer-001",
      artisanId: "user-artisan",
      name: "Ama Owusu",
      email: "customer@artisancrm.local",
      phone: "+233 55 987 6543",
      address: "East Legon, Accra",
      notes: "Prefers morning visits.",
      createdAt: "2026-04-14T09:00:00.000Z",
      updatedAt: "2026-04-14T09:00:00.000Z",
    },
    {
      id: "customer-002",
      artisanId: "user-artisan",
      name: "Kwame Boateng",
      email: "kwame@example.com",
      phone: "+233 24 444 5566",
      address: "Adenta, Accra",
      notes: "Needs weekend availability.",
      createdAt: "2026-04-13T15:30:00.000Z",
      updatedAt: "2026-04-13T15:30:00.000Z",
    },
  ],
  serviceRecords: [
    {
      id: "service-001",
      artisanId: "user-artisan",
      customerId: "customer-001",
      categoryId: "category-electrical",
      description: "Ceiling fan installation",
      cost: 350,
      status: "completed",
      serviceDate: "2026-04-10",
      createdAt: "2026-04-10T13:00:00.000Z",
      updatedAt: "2026-04-10T13:00:00.000Z",
    },
    {
      id: "service-002",
      artisanId: "user-artisan",
      customerId: "customer-002",
      categoryId: "category-electrical",
      description: "Socket replacement and wiring check",
      cost: 220,
      status: "completed",
      serviceDate: "2026-04-08",
      createdAt: "2026-04-08T11:00:00.000Z",
      updatedAt: "2026-04-08T11:00:00.000Z",
    },
  ],
  appointments: [
    {
      id: "appointment-001",
      artisanId: "user-artisan",
      customerId: "customer-001",
      customerUserId: "user-customer",
      categoryId: "category-electrical",
      title: "Fix bedroom light switch",
      description: "Switch sparks occasionally.",
      scheduledDate: "2026-04-18",
      scheduledTime: "10:00:00",
      status: "confirmed",
      createdAt: "2026-04-15T10:15:00.000Z",
      updatedAt: "2026-04-15T10:15:00.000Z",
    },
    {
      id: "appointment-002",
      artisanId: "user-artisan",
      customerId: "customer-002",
      customerUserId: null,
      categoryId: "category-electrical",
      title: "Workshop power inspection",
      description: "Check frequent power cuts.",
      scheduledDate: "2026-04-19",
      scheduledTime: "14:30:00",
      status: "pending",
      createdAt: "2026-04-15T12:30:00.000Z",
      updatedAt: "2026-04-15T12:30:00.000Z",
    },
    {
      id: "appointment-003",
      artisanId: "user-artisan",
      customerId: "customer-001",
      customerUserId: "user-customer",
      categoryId: "category-electrical",
      title: "Install security light",
      description: "Completed job follow-up visit.",
      scheduledDate: "2026-04-09",
      scheduledTime: "09:00:00",
      status: "completed",
      createdAt: "2026-04-07T08:00:00.000Z",
      updatedAt: "2026-04-09T16:00:00.000Z",
    },
  ],
  feedback: [
    {
      id: "feedback-001",
      artisanId: "user-artisan",
      customerUserId: "user-customer",
      appointmentId: "appointment-003",
      rating: 5,
      comment: "Quick response and neat work.",
      createdAt: "2026-04-09T18:00:00.000Z",
    },
    {
      id: "feedback-002",
      artisanId: "user-artisan",
      customerUserId: "user-customer",
      appointmentId: "appointment-001",
      rating: 4,
      comment: "Good communication and arrived on time.",
      createdAt: "2026-04-15T19:30:00.000Z",
    },
  ],
};

function toSqlDateTime(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

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

async function runSchema() {
  const rootConnection = await createConnection(undefined);
  await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``);
  await rootConnection.end();

  const schemaSql = await fs.readFile(schemaFile, "utf8");
  const dbConnection = await createConnection(env.dbName);
  await dbConnection.query(`
    SET FOREIGN_KEY_CHECKS = 0;
    DROP TABLE IF EXISTS feedback;
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS service_records;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS service_categories;
    DROP TABLE IF EXISTS users;
    SET FOREIGN_KEY_CHECKS = 1;
  `);
  await dbConnection.query(schemaSql);
  await dbConnection.end();
}

async function seedTables() {
  const connection = await createConnection(env.dbName);

  try {
    await connection.beginTransaction();

    for (const user of seedData.users) {
      await connection.query(
        `
          INSERT INTO users (
            id, full_name, email, password_hash, role, phone, location,
            specialization, bio, avatar_url, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          user.fullName,
          user.email,
          user.passwordHash,
          user.role,
          user.phone,
          user.location,
          user.specialization,
          user.bio,
          user.avatarUrl,
          user.isActive,
          toSqlDateTime(user.createdAt),
          toSqlDateTime(user.updatedAt),
        ],
      );
    }

    for (const category of seedData.serviceCategories) {
      await connection.query(
        "INSERT INTO service_categories (id, name, description, icon, created_at) VALUES (?, ?, ?, ?, ?)",
        [category.id, category.name, category.description, category.icon, toSqlDateTime(category.createdAt)],
      );
    }

    for (const customer of seedData.customers) {
      await connection.query(
        `
          INSERT INTO customers (
            id, artisan_id, name, email, phone, address, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          customer.id,
          customer.artisanId,
          customer.name,
          customer.email,
          customer.phone,
          customer.address,
          customer.notes,
          toSqlDateTime(customer.createdAt),
          toSqlDateTime(customer.updatedAt),
        ],
      );
    }

    for (const record of seedData.serviceRecords) {
      await connection.query(
        `
          INSERT INTO service_records (
            id, artisan_id, customer_id, category_id, description,
            cost, status, service_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          record.id,
          record.artisanId,
          record.customerId,
          record.categoryId,
          record.description,
          record.cost,
          record.status,
          record.serviceDate,
          toSqlDateTime(record.createdAt),
          toSqlDateTime(record.updatedAt),
        ],
      );
    }

    for (const appointment of seedData.appointments) {
      await connection.query(
        `
          INSERT INTO appointments (
            id, artisan_id, customer_id, customer_user_id, category_id, title,
            description, scheduled_date, scheduled_time, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          appointment.id,
          appointment.artisanId,
          appointment.customerId,
          appointment.customerUserId,
          appointment.categoryId,
          appointment.title,
          appointment.description,
          appointment.scheduledDate,
          appointment.scheduledTime,
          appointment.status,
          toSqlDateTime(appointment.createdAt),
          toSqlDateTime(appointment.updatedAt),
        ],
      );
    }

    for (const item of seedData.feedback) {
      await connection.query(
        `
          INSERT INTO feedback (
            id, artisan_id, customer_user_id, appointment_id, rating, comment, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          item.artisanId,
          item.customerUserId,
          item.appointmentId,
          item.rating,
          item.comment,
          toSqlDateTime(item.createdAt),
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

await runSchema();
await seedTables();
console.log(`Database schema applied and seeded for ${env.dbName}.`);
