ALTER TABLE users
  ADD COLUMN last_latitude DECIMAL(10, 7) NULL AFTER location,
  ADD COLUMN last_longitude DECIMAL(10, 7) NULL AFTER last_latitude,
  ADD COLUMN last_location_at TIMESTAMP NULL AFTER last_longitude;
