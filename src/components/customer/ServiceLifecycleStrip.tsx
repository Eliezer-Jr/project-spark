import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileText,
  Inbox,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { cn } from "@/lib/utils";

const stages = [
  {
    key: "request",
    step: "01",
    label: "Service request",
    hint: "Tell us what you need",
    to: "/customer/requests",
    icon: Inbox,
  },
  {
    key: "quote",
    step: "02",
    label: "My quotes",
    hint: "Review scope and price",
    to: "/customer/quotes",
    icon: FileText,
  },
  {
    key: "appointment",
    step: "03",
    label: "Appointment",
    hint: "Schedule and track the visit",
    to: "/customer/appointments",
    icon: CalendarDays,
  },
  {
    key: "history",
    step: "04",
    label: "Service history",
    hint: "Keep completed work together",
    to: "/customer/history",
    icon: ClipboardCheck,
  },
  {
    key: "feedback",
    step: "05",
    label: "My feedback",
    hint: "Rate the completed service",
    to: "/customer/feedback",
    icon: MessageSquare,
  },
] as const;

export type ServiceStage = (typeof stages)[number]["key"];
type StageCounts = Record<ServiceStage, number>;

const emptyCounts: StageCounts = {
  request: 0,
  quote: 0,
  appointment: 0,
  history: 0,
  feedback: 0,
};

export function ServiceLifecycleStrip({ active }: { active: ServiceStage }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<StageCounts>(emptyCounts);

  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const [requests, quotes, appointments, feedback] = await Promise.all([
        db.from("work_requests").select("*").eq("customer_user_id", user.id),
        db.getMyQuotes(),
        db.from("appointments").select("*").eq("customer_user_id", user.id),
        db.getMyFeedback(),
      ]);
      const appointmentRows = appointments.data || [];
      setCounts({
        request: requests.data?.length || 0,
        quote: quotes.length,
        appointment: appointmentRows.filter((item) => item.status !== "completed").length,
        history: appointmentRows.filter((item) => item.status === "completed").length,
        feedback: feedback.length,
      });
    };

    void loadCounts();
    const subscriptions = ["work_requests", "quotes", "appointments", "feedback"].map((table) =>
      db.onTableChange(table as "work_requests", () => void loadCounts()),
    );
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [user]);

  return (
    <section className="relative mb-7 overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
      <div className="relative flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> Your service journey
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            One connected process, from the first request to your final review.
          </p>
        </div>
        <span className="w-fit rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          5 connected steps
        </span>
      </div>

      <div className="overflow-x-auto px-3 py-3 sm:px-4">
        <div className="flex min-w-[800px] items-stretch">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const selected = stage.key === active;
            const hasActivity = counts[stage.key] > 0;
            return (
              <div key={stage.key} className="flex min-w-0 flex-1 items-center">
                <Link
                  to={stage.to}
                  className={cn(
                    "group relative flex min-h-24 min-w-0 flex-1 gap-3 rounded-2xl border border-transparent p-3 transition-all",
                    selected
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-md shadow-primary/15"
                      : "hover:border-border hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-background text-muted-foreground transition-colors",
                      selected && "border-white/20 bg-white/15 text-primary-foreground",
                      hasActivity && !selected && "border-primary/20 bg-primary/10 text-primary",
                    )}
                  >
                    {hasActivity && !selected ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[10px] font-bold tracking-widest text-muted-foreground", selected && "text-primary-foreground/70")}>
                      STEP {stage.step}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold">{stage.label}</span>
                    <span className={cn("mt-1 block text-xs leading-4 text-muted-foreground", selected && "text-primary-foreground/75")}>
                      {counts[stage.key] > 0 ? `${counts[stage.key]} ${counts[stage.key] === 1 ? "item" : "items"}` : stage.hint}
                    </span>
                  </span>
                </Link>
                {index < stages.length - 1 && (
                  <ArrowRight className="mx-1 h-4 w-4 shrink-0 text-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
