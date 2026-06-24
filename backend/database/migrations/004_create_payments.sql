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

CREATE INDEX idx_payments_artisan_id ON payments (artisan_id);
CREATE INDEX idx_payments_customer_user_id ON payments (customer_user_id);
CREATE INDEX idx_payments_provider_reference ON payments (provider_reference);
