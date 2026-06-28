ALTER TABLE messages
  ADD COLUMN appointment_id CHAR(36) NULL AFTER recipient_id,
  ADD CONSTRAINT fk_messages_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_appointment_created ON messages (appointment_id, created_at);
