import type { Database } from "@/types/database";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

const steps = ["Requested", "Confirmed", "En route", "Arrived", "Complete"];

export function AppointmentProgress({ appointment }: { appointment: Appointment }) {
  if (appointment.status === "cancelled") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground">
          <X className="h-3.5 w-3.5" />
        </span>
        Appointment cancelled
      </div>
    );
  }

  const activeIndex =
    appointment.status === "completed"
      ? 4
      : appointment.journey_status === "arrived"
        ? 3
        : appointment.journey_status === "en_route"
          ? 2
          : appointment.status === "confirmed"
            ? 1
            : 0;

  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div className="flex min-w-[430px] items-start">
        {steps.map((label, index) => {
          const complete = index < activeIndex || activeIndex === 4;
          const active = index === activeIndex;
          return (
            <div key={label} className="flex flex-1 items-start last:flex-none">
              <div className="flex w-16 flex-col items-center text-center">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full border-2 bg-card text-[11px] font-bold",
                    complete && "border-primary bg-primary text-primary-foreground",
                    active && !complete && "border-primary text-primary",
                    !complete && !active && "border-border text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[11px]",
                    active || complete ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-3.5 h-0.5 flex-1",
                    index < activeIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
