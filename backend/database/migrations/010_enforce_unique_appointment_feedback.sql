CREATE UNIQUE INDEX idx_feedback_appointment_customer_unique
  ON feedback (appointment_id, customer_user_id);
