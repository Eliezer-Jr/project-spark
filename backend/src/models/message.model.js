import { query } from "../database/mysql.js";

const selectFields = `
  id,
  sender_id AS senderId,
  recipient_id AS recipientId,
  appointment_id AS appointmentId,
  body,
  read_at AS readAt,
  created_at AS createdAt
`;

export const messageModel = {
  async findConversation(firstUserId, secondUserId, appointmentId = null) {
    return query(
      `SELECT ${selectFields}
       FROM messages
       WHERE ((sender_id = ? AND recipient_id = ?)
          OR (sender_id = ? AND recipient_id = ?))
         AND appointment_id <=> ?
       ORDER BY created_at ASC`,
      [firstUserId, secondUserId, secondUserId, firstUserId, appointmentId],
    );
  },

  async create(payload) {
    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, appointment_id, body)
       VALUES (?, ?, ?, ?, ?)`,
      [payload.id, payload.senderId, payload.recipientId, payload.appointmentId, payload.body],
    );
    const rows = await query(`SELECT ${selectFields} FROM messages WHERE id = ? LIMIT 1`, [
      payload.id,
    ]);
    return rows[0];
  },

  async markConversationRead(recipientId, senderId, appointmentId = null) {
    await query(
      `UPDATE messages
       SET read_at = CURRENT_TIMESTAMP
       WHERE recipient_id = ? AND sender_id = ? AND appointment_id <=> ? AND read_at IS NULL`,
      [recipientId, senderId, appointmentId],
    );
  },
};
