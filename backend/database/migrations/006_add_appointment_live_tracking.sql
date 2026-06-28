ALTER TABLE appointments
  ADD COLUMN journey_status ENUM('not_started', 'en_route', 'arrived') NOT NULL DEFAULT 'not_started' AFTER status,
  ADD COLUMN artisan_location_sharing BOOLEAN NOT NULL DEFAULT FALSE AFTER journey_status,
  ADD COLUMN customer_location_sharing BOOLEAN NOT NULL DEFAULT FALSE AFTER artisan_location_sharing;
