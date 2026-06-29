import { query } from "../database/mysql.js";

const fields = `
  id,
  artisan_id AS artisanId,
  customer_id AS customerId,
  customer_user_id AS customerUserId,
  appointment_id AS appointmentId,
  title,
  description,
  amount,
  deposit_amount AS depositAmount,
  status,
  requested_changes AS requestedChanges,
  valid_until AS validUntil,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

function mapFields(payload = {}) {
  const entries = Object.entries({
    artisan_id: payload.artisanId,
    customer_id: payload.customerId,
    customer_user_id: payload.customerUserId,
    appointment_id: payload.appointmentId,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    deposit_amount: payload.depositAmount,
    status: payload.status,
    requested_changes: payload.requestedChanges,
    valid_until: payload.validUntil,
  }).filter(([, value]) => value !== undefined);
  return { columns: entries.map(([key]) => key), values: entries.map(([, value]) => value) };
}

export const quoteModel = {
  async findAll() {
    return query(`SELECT ${fields} FROM quotes ORDER BY created_at DESC`);
  },
  async findById(id) {
    const rows = await query(`SELECT ${fields} FROM quotes WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },
  async create(payload) {
    const { columns, values } = mapFields(payload);
    await query(
      `INSERT INTO quotes (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },
  async updateById(id, patch) {
    const { columns, values } = mapFields(patch);
    if (!columns.length) return this.findById(id);
    await query(`UPDATE quotes SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`, [
      ...values,
      id,
    ]);
    return this.findById(id);
  },
};
