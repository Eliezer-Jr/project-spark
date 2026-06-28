export const APP_ROLES = ["admin", "artisan", "customer"];
export const APPOINTMENT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
export const JOURNEY_STATUSES = ["not_started", "en_route", "arrived"];
export const SERVICE_RECORD_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

export const APPOINTMENT_STATUS_TRANSITIONS = {
  pending: ["pending", "confirmed", "cancelled"],
  confirmed: ["confirmed", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};
