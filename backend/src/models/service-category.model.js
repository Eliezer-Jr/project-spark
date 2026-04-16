import { query } from "../database/mysql.js";

function mapCategoryFields(payload = {}) {
  const entries = Object.entries({
    name: payload.name,
    description: payload.description,
    icon: payload.icon,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const serviceCategoryModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        name,
        description,
        icon,
        created_at AS createdAt
      FROM service_categories
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          name,
          description,
          icon,
          created_at AS createdAt
        FROM service_categories
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapCategoryFields(payload);
    await query(
      `INSERT INTO service_categories (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapCategoryFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE service_categories SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },

  async deleteById(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await query("DELETE FROM service_categories WHERE id = ?", [id]);
    return existing;
  },
};
