import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, ClipboardList, FileText, Inbox, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const stages = [
  { key: "request", label: "Request", to: "/customer/requests", icon: Inbox },
  { key: "quote", label: "Quote", to: "/customer/quotes", icon: FileText },
  { key: "appointment", label: "Appointment", to: "/customer/appointments", icon: CalendarDays },
  { key: "history", label: "Completed", to: "/customer/history", icon: ClipboardList },
  { key: "feedback", label: "Review", to: "/customer/feedback", icon: MessageSquare },
] as const;

export type ServiceStage = (typeof stages)[number]["key"];

export function ServiceLifecycleStrip({ active }: { active: ServiceStage }) {
  const activeIndex = stages.findIndex((stage) => stage.key === active);

  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm">
      <div className="flex min-w-[620px] items-center">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const complete = index < activeIndex;
          const selected = stage.key === active;
          return (
            <div key={stage.key} className="flex min-w-0 flex-1 items-center">
              <Link
                to={stage.to}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
                    selected && "border-primary-foreground/30 bg-primary-foreground/10",
                    complete && !selected && "border-primary/20 bg-primary/10 text-primary",
                  )}
                >
                  {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate font-medium">{stage.label}</span>
              </Link>
              {index < stages.length - 1 && <div className="mx-1 h-px w-4 shrink-0 bg-border" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
