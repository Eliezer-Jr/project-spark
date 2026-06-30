import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  FolderCog,
  Inbox,
  RefreshCw,
  ShieldCheck,
  Star,
  UserRoundCheck,
  Users,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/app-db";
import { formatCurrency } from "@/lib/crm-helpers";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

type DashboardData = {
  users: number;
  activeUsers: number;
  artisans: number;
  customers: number;
  appointments: Appointment[];
  services: number;
  payments: Array<{ id: string; amount: number; status: string; created_at: string }>;
  feedback: Feedback[];
  quotes: number;
  requests: Array<{ id: string; status: string }>;
};

const EMPTY_DATA: DashboardData = {
  users: 0,
  activeUsers: 0,
  artisans: 0,
  customers: 0,
  appointments: [],
  services: 0,
  payments: [],
  feedback: [],
  quotes: 0,
  requests: [],
};

const STATUS_COLORS: Record<string, string> = {
  pending: "oklch(0.72 0.16 75)",
  confirmed: "oklch(0.58 0.18 250)",
  completed: "oklch(0.56 0.17 145)",
  cancelled: "oklch(0.58 0.2 25)",
};

export const Route = createFileRoute("/admin/dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <AdminDashContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function AdminDashContent() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rolesRes, profilesRes, apptRes, serviceRes, paymentRes, feedback, quotes, requestRes] =
      await Promise.all([
        db.from("user_roles").select("role"),
        db.from("profiles").select("id, is_active"),
        db.from("appointments").select("*").order("created_at", { ascending: false }),
        db.from("service_records").select("id", { count: "exact" }),
        db.from("payments").select("id, amount, status, created_at"),
        db.getPublicFeedback(),
        db.getMyQuotes(),
        db.from("work_requests").select("id, status"),
      ]);

    const roles = (rolesRes.data || []) as Array<{ role: string }>;
    const profiles = (profilesRes.data || []) as Array<{ id: string; is_active: boolean }>;

    setData({
      users: roles.length,
      activeUsers: profiles.filter((profile) => profile.is_active).length,
      artisans: roles.filter((role) => role.role === "artisan").length,
      customers: roles.filter((role) => role.role === "customer").length,
      appointments: (apptRes.data || []) as Appointment[],
      services: serviceRes.count || 0,
      payments: (paymentRes.data || []) as DashboardData["payments"],
      feedback: feedback as Feedback[],
      quotes: quotes.length,
      requests: (requestRes.data || []) as DashboardData["requests"],
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const insights = useMemo(() => {
    const appointmentCounts = data.appointments.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
    const successfulPayments = data.payments.filter((payment) => payment.status === "successful");
    const paidRevenue = successfulPayments.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0,
    );
    const averageRating = data.feedback.length
      ? data.feedback.reduce((total, item) => total + Number(item.rating || 0), 0) /
        data.feedback.length
      : 0;
    const completionRate = data.appointments.length
      ? Math.round(((appointmentCounts.completed || 0) / data.appointments.length) * 100)
      : 0;
    const activeRate = data.users ? Math.round((data.activeUsers / data.users) * 100) : 0;

    return {
      appointmentCounts,
      paidRevenue,
      averageRating,
      completionRate,
      activeRate,
      pendingPayments: data.payments.filter((payment) => payment.status === "pending").length,
      openRequests: data.requests.filter((request) => ["new", "reviewing"].includes(request.status))
        .length,
    };
  }, [data]);

  const appointmentChart = ["pending", "confirmed", "completed", "cancelled"].map((name) => ({
    name,
    value: insights.appointmentCounts[name] || 0,
  }));

  const platformChart = [
    { name: "Artisans", value: data.artisans },
    { name: "Customers", value: data.customers },
    { name: "Services", value: data.services },
    { name: "Quotes", value: data.quotes },
  ];

  if (loading && !lastUpdated) return <DashboardSkeleton />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-primary px-5 py-6 text-primary-foreground shadow-sm md:px-7">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-black/5" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-primary-foreground/75">
              <ShieldCheck className="h-4 w-4" />
              <span>Platform command center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Good to see you, Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-primary-foreground/75">
              Monitor platform health, revenue, service activity, and items that need your
              attention.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-primary-foreground/70 sm:block">
              <p>Last refreshed</p>
              <p className="font-medium text-primary-foreground">
                {lastUpdated?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Registered users"
          value={data.users}
          detail={`${data.artisans} artisans · ${data.customers} customers`}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Paid revenue"
          value={formatCurrency(insights.paidRevenue)}
          detail={`${data.payments.filter((item) => item.status === "successful").length} successful payments`}
          icon={CircleDollarSign}
          tone="green"
        />
        <MetricCard
          label="All appointments"
          value={data.appointments.length}
          detail={`${insights.appointmentCounts.completed || 0} completed · ${insights.completionRate}% rate`}
          icon={Calendar}
          tone="violet"
        />
        <MetricCard
          label="Customer rating"
          value={insights.averageRating ? insights.averageRating.toFixed(1) : "—"}
          detail={`${data.feedback.length} customer reviews`}
          icon={Star}
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-card-foreground">Appointment health</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Work moving through the service pipeline
              </p>
            </div>
            <Link
              to="/admin/analytics"
              className="text-sm font-medium text-primary hover:underline"
            >
              Full analytics
            </Link>
          </div>
          <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentChart} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    className="capitalize text-xs"
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    className="text-xs"
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appointmentChart.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 rounded-xl bg-muted/45 p-4">
              <HealthRow label="Completion rate" value={insights.completionRate} />
              <HealthRow label="Active accounts" value={insights.activeRate} />
              <div className="border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Services logged
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{data.services}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-card-foreground">Needs attention</h2>
            <p className="mt-1 text-sm text-muted-foreground">Items that may need an admin check</p>
          </div>
          <div className="space-y-3">
            <AttentionItem
              icon={Clock3}
              label="Pending appointments"
              value={insights.appointmentCounts.pending || 0}
              tone="amber"
              to="/admin/operations"
            />
            <AttentionItem
              icon={CreditCard}
              label="Pending payments"
              value={insights.pendingPayments}
              tone="violet"
              to="/admin/operations"
            />
            <AttentionItem
              icon={Inbox}
              label="Open work requests"
              value={insights.openRequests}
              tone="blue"
              to="/admin/operations"
            />
            <AttentionItem
              icon={UserRoundCheck}
              label="Inactive accounts"
              value={Math.max(data.users - data.activeUsers, 0)}
              tone="red"
              to="/admin/users"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.72fr]">
        <RecentAppointments appointments={data.appointments.slice(0, 5)} />
        <PlatformMix chartData={platformChart} />
        <QuickActions />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function AttentionItem({
  icon: Icon,
  label,
  value,
  tone,
  to,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: "amber" | "violet" | "blue" | "red";
  to: "/admin/activity" | "/admin/analytics" | "/admin/users" | "/admin/operations";
}) {
  const tones = {
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
    >
      <span className={cn("rounded-lg p-2", tones[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-card-foreground">{label}</span>
      <Badge variant={value > 0 ? "secondary" : "outline"}>{value}</Badge>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function RecentAppointments({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-card-foreground">Recent appointments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Newest bookings across the platform</p>
        </div>
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      {appointments.length ? (
        <div className="divide-y">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {appointment.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(`${appointment.scheduled_date}T00:00:00`).toLocaleDateString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}{" "}
                  · {appointment.scheduled_time}
                </p>
              </div>
              <StatusBadge status={appointment.status} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Calendar} label="No appointments yet" />
      )}
      <Button asChild variant="ghost" className="mt-4 w-full gap-2">
        <Link to="/admin/activity">
          View all activity <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[11px] font-medium capitalize",
        styles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function PlatformMix({ chartData }: { chartData: Array<{ name: string; value: number }> }) {
  const colors = [
    "oklch(0.58 0.18 250)",
    "oklch(0.56 0.17 145)",
    "oklch(0.68 0.17 75)",
    "oklch(0.58 0.18 310)",
  ];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <div>
        <h2 className="font-semibold text-card-foreground">Platform mix</h2>
        <p className="mt-1 text-sm text-muted-foreground">A snapshot of your marketplace</p>
      </div>
      <div className="mt-2 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={75}
              paddingAngle={3}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index] }} />
            <span className="flex-1 text-muted-foreground">{item.name}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { to: "/admin/operations" as const, label: "Open operations", icon: Inbox },
    { to: "/admin/users" as const, label: "Manage users", icon: Users },
    { to: "/admin/categories" as const, label: "Service categories", icon: FolderCog },
    { to: "/admin/analytics" as const, label: "View analytics", icon: FileText },
    { to: "/admin/activity" as const, label: "Activity log", icon: Activity },
  ];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
      <h2 className="font-semibold text-card-foreground">Quick actions</h2>
      <p className="mt-1 text-sm text-muted-foreground">Jump to common admin tasks</p>
      <div className="mt-5 space-y-2">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-3 rounded-xl p-3 hover:bg-muted/60"
          >
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-card-foreground">{label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Dashboard data is up to date
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed text-muted-foreground">
      <Icon className="mb-2 h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
