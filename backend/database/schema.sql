CREATE DATABASE IF NOT EXISTS artisan_crm;
USE artisan_crm;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'artisan', 'customer') NOT NULL DEFAULT 'customer',
  phone VARCHAR(30) UNIQUE,
  location VARCHAR(150),
  last_latitude DECIMAL(10, 7),
  last_longitude DECIMAL(10, 7),
  last_location_at TIMESTAMP NULL,
  specialization VARCHAR(120),
  bio TEXT,
  avatar_url VARCHAR(255),
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sms BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY,
  artisan_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  address VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_records (
  id CHAR(36) PRIMARY KEY,
  artisan_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NOT NULL,
  category_id CHAR(36),
  description TEXT NOT NULL,
  cost DECIMAL(10, 2),
  status VARCHAR(40) NOT NULL DEFAULT 'completed',
  service_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_records_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_records_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_records_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id CHAR(36) PRIMARY KEY,
  artisan_id CHAR(36) NOT NULL,
  customer_id CHAR(36),
  customer_user_id CHAR(36),
  category_id CHAR(36),
  title VARCHAR(150) NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  journey_status ENUM('not_started', 'en_route', 'arrived') NOT NULL DEFAULT 'not_started',
  artisan_location_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  customer_location_sharing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_customer_user FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id CHAR(36) PRIMARY KEY,
  artisan_id CHAR(36) NOT NULL,
  customer_user_id CHAR(36) NOT NULL,
  appointment_id CHAR(36),
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_customer_user FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) PRIMARY KEY,
  quote_id VARCHAR(80),
  artisan_id CHAR(36) NOT NULL,
  customer_user_id CHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'GHS',
  phone VARCHAR(30) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'redde',
  provider_reference VARCHAR(120),
  checkout_url VARCHAR(500),
  status ENUM('pending', 'successful', 'failed') NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_customer_user FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_customers_artisan_id ON customers (artisan_id);
CREATE INDEX idx_service_records_artisan_id ON service_records (artisan_id);
CREATE INDEX idx_service_records_customer_id ON service_records (customer_id);
CREATE INDEX idx_appointments_artisan_id ON appointments (artisan_id);
CREATE INDEX idx_appointments_customer_user_id ON appointments (customer_user_id);
CREATE INDEX idx_feedback_artisan_id ON feedback (artisan_id);
CREATE INDEX idx_feedback_customer_user_id ON feedback (customer_user_id);
CREATE INDEX idx_payments_artisan_id ON payments (artisan_id);
CREATE INDEX idx_payments_customer_user_id ON payments (customer_user_id);
CREATE INDEX idx_payments_provider_reference ON payments (provider_reference);
