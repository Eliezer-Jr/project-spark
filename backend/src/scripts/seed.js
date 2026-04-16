import mysql from "mysql2/promise";
import { env } from "../config/env.js";
import { buildSeedData } from "../../database/seeds/001_core_seed.js";

function toSqlDateTime(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function createConnection() {
  return mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    multipleStatements: true,
  });
}

const seedData = buildSeedData();
const connection = await createConnection();

try {
  await connection.beginTransaction();

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("TRUNCATE TABLE feedback");
  await connection.query("TRUNCATE TABLE appointments");
  await connection.query("TRUNCATE TABLE service_records");
  await connection.query("TRUNCATE TABLE customers");
  await connection.query("TRUNCATE TABLE service_categories");
  await connection.query("TRUNCATE TABLE users");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

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
  console.log(`Seed complete for ${env.dbName}.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
