import { query } from "../database/mysql.js";

function mapCustomerFields(payload = {}) {
  const entries = Object.entries({
    artisan_id: payload.artisanId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    notes: payload.notes,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const customerModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        artisan_id AS artisanId,
        name,
        email,
        phone,
        address,
        notes,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customers
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          artisan_id AS artisanId,
          name,
          email,
          phone,
          address,
          notes,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM customers
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapCustomerFields(payload);
    await query(
      `INSERT INTO customers (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapCustomerFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE customers SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await query("DELETE FROM customers WHERE id = ?", [id]);
    return existing;
  },
};
