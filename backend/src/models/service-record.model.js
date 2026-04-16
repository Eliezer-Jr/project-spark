import { query } from "../database/mysql.js";

function mapServiceRecordFields(payload = {}) {
  const entries = Object.entries({
    artisan_id: payload.artisanId,
    customer_id: payload.customerId,
    category_id: payload.categoryId,
    description: payload.description,
    cost: payload.cost,
    status: payload.status,
    service_date: payload.serviceDate,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const serviceRecordModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        artisan_id AS artisanId,
        customer_id AS customerId,
        category_id AS categoryId,
        description,
        cost,
        status,
        service_date AS serviceDate,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM service_records
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          artisan_id AS artisanId,
          customer_id AS customerId,
          category_id AS categoryId,
          description,
          cost,
          status,
          service_date AS serviceDate,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM service_records
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapServiceRecordFields(payload);
    await query(
      `INSERT INTO service_records (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapServiceRecordFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE service_records SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await query("DELETE FROM service_records WHERE id = ?", [id]);
    return existing;
  },
};
