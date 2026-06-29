import { query } from "../database/mysql.js";

function toMySqlDateTime(value) {
  if (value == null || value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 19).replace("T", " ");
}

function mapUserFields(payload = {}) {
  const entries = Object.entries({
    full_name: payload.fullName,
    email: payload.email,
    password_hash: payload.passwordHash,
    role: payload.role,
    phone: payload.phone,
    gender: payload.gender,
    date_of_birth: payload.dateOfBirth,
    business_name: payload.businessName,
    artisan_category: payload.artisanCategory,
    location: payload.location,
    address: payload.address,
    region: payload.region,
    city: payload.city,
    digital_address: payload.digitalAddress,
    last_latitude: payload.lastLatitude,
    last_longitude: payload.lastLongitude,
    last_location_at: toMySqlDateTime(payload.lastLocationAt),
    specialization: payload.specialization,
    years_experience: payload.yearsExperience,
    bio: payload.bio,
    id_type: payload.idType,
    id_number: payload.idNumber,
    id_card_url: payload.idCardUrl,
    portfolio_urls:
      payload.portfolioUrls === undefined ? undefined : JSON.stringify(payload.portfolioUrls),
    price_range: payload.priceRange,
    availability: payload.availability,
    working_days:
      payload.workingDays === undefined ? undefined : JSON.stringify(payload.workingDays),
    working_hours: payload.workingHours,
    whatsapp_number: payload.whatsappNumber,
    emergency_contact_name: payload.emergencyContactName,
    emergency_contact_phone: payload.emergencyContactPhone,
    payment_account_name: payload.paymentAccountName,
    momo_number: payload.momoNumber,
    preferred_payment_method: payload.preferredPaymentMethod,
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
        gender,
        date_of_birth AS dateOfBirth,
        business_name AS businessName,
        artisan_category AS artisanCategory,
        location,
        address,
        region,
        city,
        digital_address AS digitalAddress,
        last_latitude AS lastLatitude,
        last_longitude AS lastLongitude,
        last_location_at AS lastLocationAt,
        specialization,
        years_experience AS yearsExperience,
        bio,
        id_type AS idType,
        id_number AS idNumber,
        id_card_url AS idCardUrl,
        portfolio_urls AS portfolioUrls,
        price_range AS priceRange,
        availability,
        working_days AS workingDays,
        working_hours AS workingHours,
        whatsapp_number AS whatsappNumber,
        emergency_contact_name AS emergencyContactName,
        emergency_contact_phone AS emergencyContactPhone,
        payment_account_name AS paymentAccountName,
        momo_number AS momoNumber,
        preferred_payment_method AS preferredPaymentMethod,
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
          gender,
          date_of_birth AS dateOfBirth,
          business_name AS businessName,
          artisan_category AS artisanCategory,
          location,
          address,
          region,
          city,
          digital_address AS digitalAddress,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          years_experience AS yearsExperience,
          bio,
          id_type AS idType,
          id_number AS idNumber,
          id_card_url AS idCardUrl,
          portfolio_urls AS portfolioUrls,
          price_range AS priceRange,
          availability,
          working_days AS workingDays,
          working_hours AS workingHours,
          whatsapp_number AS whatsappNumber,
          emergency_contact_name AS emergencyContactName,
          emergency_contact_phone AS emergencyContactPhone,
          payment_account_name AS paymentAccountName,
          momo_number AS momoNumber,
          preferred_payment_method AS preferredPaymentMethod,
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
          gender,
          date_of_birth AS dateOfBirth,
          business_name AS businessName,
          artisan_category AS artisanCategory,
          location,
          address,
          region,
          city,
          digital_address AS digitalAddress,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          years_experience AS yearsExperience,
          bio,
          id_type AS idType,
          id_number AS idNumber,
          id_card_url AS idCardUrl,
          portfolio_urls AS portfolioUrls,
          price_range AS priceRange,
          availability,
          working_days AS workingDays,
          working_hours AS workingHours,
          whatsapp_number AS whatsappNumber,
          emergency_contact_name AS emergencyContactName,
          emergency_contact_phone AS emergencyContactPhone,
          payment_account_name AS paymentAccountName,
          momo_number AS momoNumber,
          preferred_payment_method AS preferredPaymentMethod,
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
          gender,
          date_of_birth AS dateOfBirth,
          business_name AS businessName,
          artisan_category AS artisanCategory,
          location,
          address,
          region,
          city,
          digital_address AS digitalAddress,
          last_latitude AS lastLatitude,
          last_longitude AS lastLongitude,
          last_location_at AS lastLocationAt,
          specialization,
          years_experience AS yearsExperience,
          bio,
          id_type AS idType,
          id_number AS idNumber,
          id_card_url AS idCardUrl,
          portfolio_urls AS portfolioUrls,
          price_range AS priceRange,
          availability,
          working_days AS workingDays,
          working_hours AS workingHours,
          whatsapp_number AS whatsappNumber,
          emergency_contact_name AS emergencyContactName,
          emergency_contact_phone AS emergencyContactPhone,
          payment_account_name AS paymentAccountName,
          momo_number AS momoNumber,
          preferred_payment_method AS preferredPaymentMethod,
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
