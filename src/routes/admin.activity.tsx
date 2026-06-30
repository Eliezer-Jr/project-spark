import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Calendar, MessageSquare, Search, Star, Wrench } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/app-db";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type FeedItem =
  | { id: string; type: "appointment"; title: string; detail: string; status: string; date: string }
  | { id: string; type: "feedback"; title: string; detail: string; rating: number; date: string };

export const Route = createFileRoute("/admin/activity")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <ActivityContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function ActivityContent() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "appointment" | "feedback">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [apptRes, feedbackRes, profileRes] = await Promise.all([
        db.from("appointments").select("*").order("created_at", { ascending: false }).limit(30),
        db.getPublicFeedback(),
        db.from("profiles").select("id, full_name, business_name"),
      ]);
      setAppointments((apptRes.data || []) as Appointment[]);
      setFeedback((feedbackRes || []).slice(0, 30) as Feedback[]);
      setNames(
        (
          (profileRes.data || []) as Array<{
            id: string;
            full_name: string;
            business_name: string | null;
          }>
        ).reduce<Record<string, string>>(
          (map, profile) => ({ ...map, [profile.id]: profile.business_name || profile.full_name }),
          {},
        ),
      );
      setLoading(false);
    };
    void load();
  }, []);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...appointments.map(
        (item): FeedItem => ({
          id: item.id,
          type: "appointment",
          title: item.title,
          detail: `${names[item.customer_user_id || ""] || "A customer"} booked ${names[item.artisan_id] || "an artisan"}`,
          status: item.status,
          date: item.created_at,
        }),
      ),
      ...feedback.map(
        (item): FeedItem => ({
          id: item.id,
          type: "feedback",
          title: `${names[item.customer_user_id] || "A customer"} left feedback`,
          detail: item.comment || "No written comment",
          rating: item.rating,
          date: item.created_at,
        }),
      ),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const query = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (filter === "all" || item.type === filter) &&
        (!query || `${item.title} ${item.detail}`.toLowerCase().includes(query)),
    );
  }, [appointments, feedback, names, search, filter]);

  const avgRating = feedback.length
    ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length
    : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Activity Center"
        description="A live chronological view of marketplace activity"
        action={
          <Button asChild variant="outline">
            <Link to="/admin/operations">
              Open operations <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <ActivityStat icon={Calendar} label="Recent bookings" value={appointments.length} />
        <ActivityStat icon={MessageSquare} label="Customer reviews" value={feedback.length} />
        <ActivityStat
          icon={Star}
          label="Average rating"
          value={avgRating ? avgRating.toFixed(1) : "—"}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity…"
              className="pl-9"
            />
          </div>
          <div className="flex rounded-lg bg-muted p-1">
            {(["all", "appointment", "feedback"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "secondary" : "ghost"}
                className="h-7 capitalize"
                onClick={() => setFilter(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : feed.length ? (
          <div className="p-5 md:p-6">
            <div className="relative space-y-0 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-border">
              {feed.map((item) => (
                <FeedRow key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center text-muted-foreground">
            <Activity className="mb-3 h-8 w-8 opacity-50" />
            <p className="text-sm">No activity matches your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <div className="relative flex gap-4 py-4 first:pt-1">
      <span
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-card",
          item.type === "appointment"
            ? "bg-blue-500/15 text-blue-600"
            : "bg-amber-500/15 text-amber-600",
        )}
      >
        {item.type === "appointment" ? (
          <Wrench className="h-4 w-4" />
        ) : (
          <Star className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-card-foreground">{item.title}</p>
          <span className="text-xs text-muted-foreground">{relativeDate(item.date)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
        <div className="mt-2">
          {item.type === "appointment" ? (
            <Badge variant="outline" className="capitalize">
              {item.status}
            </Badge>
          ) : (
            <span className="text-xs font-medium text-amber-600">
              {"★".repeat(item.rating)}
              {"☆".repeat(5 - item.rating)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
