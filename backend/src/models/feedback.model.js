import { query } from "../database/mysql.js";

function mapFeedbackFields(payload = {}) {
  const entries = Object.entries({
    artisan_id: payload.artisanId,
    customer_user_id: payload.customerUserId,
    appointment_id: payload.appointmentId,
    rating: payload.rating,
    comment: payload.comment,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const feedbackModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        artisan_id AS artisanId,
        customer_user_id AS customerUserId,
        appointment_id AS appointmentId,
        rating,
        comment,
        created_at AS createdAt
      FROM feedback
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          artisan_id AS artisanId,
          customer_user_id AS customerUserId,
          appointment_id AS appointmentId,
          rating,
          comment,
          created_at AS createdAt
        FROM feedback
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapFeedbackFields(payload);
    await query(
      `INSERT INTO feedback (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapFeedbackFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE feedback SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await query("DELETE FROM feedback WHERE id = ?", [id]);
    return existing;
  },
};
