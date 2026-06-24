import { query } from "../database/mysql.js";

function mapPaymentFields(payload = {}) {
  const entries = Object.entries({
    quote_id: payload.quoteId,
    artisan_id: payload.artisanId,
    customer_user_id: payload.customerUserId,
    amount: payload.amount,
    currency: payload.currency,
    phone: payload.phone,
    provider: payload.provider,
    provider_reference: payload.providerReference,
    checkout_url: payload.checkoutUrl,
    status: payload.status,
    note: payload.note,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

const paymentSelect = `
  SELECT
    id,
    quote_id AS quoteId,
    artisan_id AS artisanId,
    customer_user_id AS customerUserId,
    amount,
    currency,
    phone,
    provider,
    provider_reference AS providerReference,
    checkout_url AS checkoutUrl,
    status,
    note,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM payments
`;

export const paymentModel = {
  async findAll() {
    return query(paymentSelect);
  },

  async findById(id) {
    const rows = await query(`${paymentSelect} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  async findByProviderReference(providerReference) {
    const rows = await query(`${paymentSelect} WHERE provider_reference = ? LIMIT 1`, [providerReference]);
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapPaymentFields(payload);
    await query(
      `INSERT INTO payments (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapPaymentFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE payments SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },
};
