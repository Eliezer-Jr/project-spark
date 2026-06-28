import { query } from "../database/mysql.js";

function mapUserFields(payload = {}) {
  const entries = Object.entries({
    full_name: payload.fullName,
    email: payload.email,
    password_hash: payload.passwordHash,
    role: payload.role,
    phone: payload.phone,
    location: payload.location,
    last_latitude: payload.lastLatitude,
    last_longitude: payload.lastLongitude,
    last_location_at: payload.lastLocationAt,
    specialization: payload.specialization,
    bio: payload.bio,
    avatar_url: payload.avatarUrl,
    notify_email: payload.notifyEmail,
    notify_sms: payload.notifySms,
    is_active: payload.isActive,
  }).filter(([, value]) => value !== undefined);

  return {
    columns: entries.map(([column]) => column),
    values: entries.map(([, value]) => value),
  };
}

export const userModel = {
  async findAll() {
    return query(`
      SELECT
        id,
        full_name AS fullName,
        email,
        password_hash AS passwordHash,
        role,
        phone,
        location,
        last_latitude AS lastLatitude,
        last_longitude AS lastLongitude,
        last_location_at AS lastLocationAt,
        specialization,
        bio,
        avatar_url AS avatarUrl,
        notify_email AS notifyEmail,
        notify_sms AS notifySms,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM users
    `);
  },

  async findById(id) {
    const rows = await query(
      `
        SELECT
          id,
          full_name AS fullName,
          email,
          password_hash AS passwordHash,
          role,
          phone,
          location,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          bio,
          avatar_url AS avatarUrl,
          notify_email AS notifyEmail,
          notify_sms AS notifySms,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const rows = await query(
      `
        SELECT
          id,
          full_name AS fullName,
          email,
          password_hash AS passwordHash,
          role,
          phone,
          location,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          bio,
          avatar_url AS avatarUrl,
          notify_email AS notifyEmail,
          notify_sms AS notifySms,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [email],
    );
    return rows[0] || null;
  },

  async findByPhone(phone) {
    const rows = await query(
      `
        SELECT
          id,
          full_name AS fullName,
          email,
          password_hash AS passwordHash,
          role,
          phone,
          location,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          bio,
          avatar_url AS avatarUrl,
          notify_email AS notifyEmail,
          notify_sms AS notifySms,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM users
        WHERE REPLACE(phone, ' ', '') = ?
        LIMIT 1
      `,
      [phone],
    );
    return rows[0] || null;
  },

  async create(payload) {
    const { columns, values } = mapUserFields(payload);
    await query(
      `INSERT INTO users (id, ${columns.join(", ")}) VALUES (?, ${columns.map(() => "?").join(", ")})`,
      [payload.id, ...values],
    );
    return this.findById(payload.id);
  },

  async updateById(id, patch) {
    const { columns, values } = mapUserFields(patch);
    if (!columns.length) {
      return this.findById(id);
    }

    await query(
      `UPDATE users SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
      [...values, id],
    );
    return this.findById(id);
  },
};
