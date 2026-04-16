import type { AppointmentStatus } from "@/types/database";

const TIME_SLOT_POOL = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatTimeLabel(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function getStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
    case "completed":
      return "bg-success/10 text-success";
    case "pending":
    case "in_progress":
      return "bg-warning/10 text-warning";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function isBlockingAppointmentStatus(status: AppointmentStatus) {
  return status === "pending" || status === "confirmed";
}

export function getAvailableTimeSuggestions(
  appointments: Array<{ scheduled_date: string; scheduled_time: string; status: AppointmentStatus }>,
  selectedDate: string,
  limit = 4,
) {
  const taken = new Set(
    appointments
      .filter((appointment) => appointment.scheduled_date === selectedDate && isBlockingAppointmentStatus(appointment.status))
      .map((appointment) => appointment.scheduled_time.slice(0, 5)),
  );

  return TIME_SLOT_POOL.filter((slot) => !taken.has(slot)).slice(0, limit);
}
