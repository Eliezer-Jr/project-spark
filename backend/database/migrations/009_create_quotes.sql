CREATE TABLE IF NOT EXISTS quotes (
  id CHAR(36) PRIMARY KEY,
  artisan_id CHAR(36) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_user_id CHAR(36) NOT NULL,
  appointment_id CHAR(36) NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2) NULL,
  status ENUM('draft', 'awaiting_response', 'changes_requested', 'approved', 'converted', 'archived') NOT NULL DEFAULT 'draft',
  requested_changes TEXT NULL,
  valid_until DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quotes_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_quotes_customer_user FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE INDEX idx_quotes_artisan ON quotes (artisan_id, created_at);
CREATE INDEX idx_quotes_customer_user ON quotes (customer_user_id, created_at);
CREATE UNIQUE INDEX idx_quotes_appointment_unique ON quotes (appointment_id);
