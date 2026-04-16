import { query } from "../database/mysql.js";

function mapAppointmentFields(payload = {}) {
  const entries = Object.entries({
    artisan_id: payload.artisanId,
    customer_id: payload.customerId,
    customer_user_id: payload.customerUserId,
    category_id: payload.categoryId,
    title: payload.title,
    description: payload.description,
    scheduled_date: payload.scheduledDate,
    scheduled_time: payload.scheduledTime,
    status: payload.status,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const appointmentModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        artisan_id AS artisanId,
        customer_id AS customerId,
        customer_user_id AS customerUserId,
        category_id AS categoryId,
        title,
        description,
        scheduled_date AS scheduledDate,
        scheduled_time AS scheduledTime,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM appointments
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          artisan_id AS artisanId,
          customer_id AS customerId,
          customer_user_id AS customerUserId,
          category_id AS categoryId,
          title,
          description,
          scheduled_date AS scheduledDate,
          scheduled_time AS scheduledTime,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM appointments
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapAppointmentFields(payload);
    await query(
      `INSERT INTO appointments (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapAppointmentFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE appointments SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await query("DELETE FROM appointments WHERE id = ?", [id]);
    return existing;
  },
};
