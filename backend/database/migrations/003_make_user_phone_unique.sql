ALTER TABLE users
  ADD UNIQUE INDEX idx_users_phone_unique (phone);
