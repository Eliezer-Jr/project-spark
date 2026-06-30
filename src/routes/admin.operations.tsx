import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Inbox,
  Search,
  WalletCards,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/app-db";
import { formatCurrency } from "@/lib/crm-helpers";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type WorkRequest = Database["public"]["Tables"]["work_requests"]["Row"];

type OperationsData = {
  appointments: Appointment[];
  payments: Payment[];
  quotes: Quote[];
  requests: WorkRequest[];
  names: Record<string, string>;
};

export const Route = createFileRoute("/admin/operations")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <OperationsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function OperationsContent() {
  const [data, setData] = useState<OperationsData>({
    appointments: [],
    payments: [],
    quotes: [],
    requests: [],
    names: {},
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [appointments, payments, quotes, requests, profiles] = await Promise.all([
        db.from("appointments").select("*").order("created_at", { ascending: false }),
        db.from("payments").select("*").order("created_at", { ascending: false }),
        db.from("quotes").select("*").order("created_at", { ascending: false }),
        db.from("work_requests").select("*").order("created_at", { ascending: false }),
        db.from("profiles").select("id, full_name, business_name"),
      ]);
      const names = (
        (profiles.data || []) as Array<{
          id: string;
          full_name: string;
          business_name: string | null;
        }>
      ).reduce<Record<string, string>>(
        (map, profile) => ({
          ...map,
          [profile.id]: profile.business_name || profile.full_name || "Unknown user",
        }),
        {},
      );
      setData({
        appointments: (appointments.data || []) as Appointment[],
        payments: (payments.data || []) as Payment[],
        quotes: (quotes.data || []) as Quote[],
        requests: (requests.data || []) as WorkRequest[],
        names,
      });
      setLoading(false);
    };
    void load();
  }, []);

  const query = search.trim().toLowerCase();
  const matches = useCallback(
    (...values: Array<string | null | undefined>) =>
      !query || values.some((value) => value?.toLowerCase().includes(query)),
    [query],
  );
  const filtered = useMemo(
    () => ({
      appointments: data.appointments.filter((item) =>
        matches(
          item.title,
          item.status,
          data.names[item.artisan_id],
          data.names[item.customer_user_id || ""],
        ),
      ),
      payments: data.payments.filter((item) =>
        matches(
          item.status,
          item.phone,
          item.provider_reference,
          data.names[item.artisan_id],
          data.names[item.customer_user_id],
        ),
      ),
      quotes: data.quotes.filter((item) =>
        matches(
          item.title,
          item.status,
          data.names[item.artisan_id],
          data.names[item.customer_user_id || ""],
        ),
      ),
      requests: data.requests.filter((item) =>
        matches(
          item.title,
          item.status,
          data.names[item.artisan_id || ""],
          data.names[item.customer_user_id],
        ),
      ),
    }),
    [data, matches],
  );

  const paidRevenue = data.payments
    .filter((item) => item.status === "successful")
    .reduce((total, item) => total + Number(item.amount || 0), 0);
  const openRequests = data.requests.filter((item) =>
    ["new", "reviewing"].includes(item.status),
  ).length;
  const awaitingQuotes = data.quotes.filter((item) =>
    ["awaiting_response", "changes_requested"].includes(item.status),
  ).length;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Operations"
        description="Track every request from first contact through payment"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Inbox} label="Open requests" value={openRequests} tone="blue" />
        <SummaryCard
          icon={FileText}
          label="Quotes awaiting action"
          value={awaitingQuotes}
          tone="amber"
        />
        <SummaryCard
          icon={Calendar}
          label="Appointments"
          value={data.appointments.length}
          tone="violet"
        />
        <SummaryCard
          icon={CircleDollarSign}
          label="Collected revenue"
          value={formatCurrency(paidRevenue)}
          tone="green"
        />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4 md:p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles, people, status or reference…"
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="requests" className="p-4 md:p-5">
            <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 md:inline-grid md:w-auto md:grid-cols-4">
              <TabsTrigger value="requests">Requests ({filtered.requests.length})</TabsTrigger>
              <TabsTrigger value="quotes">Quotes ({filtered.quotes.length})</TabsTrigger>
              <TabsTrigger value="appointments">
                Appointments ({filtered.appointments.length})
              </TabsTrigger>
              <TabsTrigger value="payments">Payments ({filtered.payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <RequestsTable items={filtered.requests} names={data.names} />
            </TabsContent>
            <TabsContent value="quotes">
              <QuotesTable items={filtered.quotes} names={data.names} />
            </TabsContent>
            <TabsContent value="appointments">
              <AppointmentsTable items={filtered.appointments} names={data.names} />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTable items={filtered.payments} names={data.names} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Inbox;
  label: string;
  value: string | number;
  tone: "blue" | "amber" | "violet" | "green";
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <span className={cn("rounded-xl p-3", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}

function RequestsTable({ items, names }: { items: WorkRequest[]; names: Record<string, string> }) {
  return (
    <DataTable
      headers={["Request", "Customer", "Artisan", "Preferred date", "Status"]}
      empty="No requests found"
    >
      {items.map((item) => (
        <tr key={item.id} className="border-t hover:bg-muted/30">
          <TitleCell title={item.title} subtitle={item.description} />
          <Cell>{names[item.customer_user_id] || "Unknown customer"}</Cell>
          <Cell>
            {item.artisan_id ? names[item.artisan_id] || "Unknown artisan" : "Unassigned"}
          </Cell>
          <Cell>{formatDate(item.preferred_date)}</Cell>
          <Cell>
            <Status status={item.status} />
          </Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function QuotesTable({ items, names }: { items: Quote[]; names: Record<string, string> }) {
  return (
    <DataTable
      headers={["Quote", "Customer", "Artisan", "Amount", "Status"]}
      empty="No quotes found"
    >
      {items.map((item) => (
        <tr key={item.id} className="border-t hover:bg-muted/30">
          <TitleCell title={item.title} subtitle={`Created ${formatDate(item.created_at)}`} />
          <Cell>
            {item.customer_user_id ? names[item.customer_user_id] || "Unknown customer" : "—"}
          </Cell>
          <Cell>{names[item.artisan_id] || "Unknown artisan"}</Cell>
          <Cell strong>{formatCurrency(item.amount)}</Cell>
          <Cell>
            <Status status={item.status} />
          </Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function AppointmentsTable({
  items,
  names,
}: {
  items: Appointment[];
  names: Record<string, string>;
}) {
  return (
    <DataTable
      headers={["Appointment", "Customer", "Artisan", "Schedule", "Status"]}
      empty="No appointments found"
    >
      {items.map((item) => (
        <tr key={item.id} className="border-t hover:bg-muted/30">
          <TitleCell title={item.title} subtitle={item.description || "No description"} />
          <Cell>
            {item.customer_user_id ? names[item.customer_user_id] || "Unknown customer" : "—"}
          </Cell>
          <Cell>{names[item.artisan_id] || "Unknown artisan"}</Cell>
          <Cell>
            {formatDate(item.scheduled_date)} · {item.scheduled_time}
          </Cell>
          <Cell>
            <Status status={item.status} />
          </Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function PaymentsTable({ items, names }: { items: Payment[]; names: Record<string, string> }) {
  return (
    <DataTable
      headers={["Reference", "Customer", "Artisan", "Amount", "Status"]}
      empty="No payments found"
    >
      {items.map((item) => (
        <tr key={item.id} className="border-t hover:bg-muted/30">
          <TitleCell
            title={item.provider_reference || "Pending reference"}
            subtitle={formatDate(item.created_at)}
          />
          <Cell>{names[item.customer_user_id] || item.phone}</Cell>
          <Cell>{names[item.artisan_id] || "Unknown artisan"}</Cell>
          <Cell strong>{formatCurrency(item.amount)}</Cell>
          <Cell>
            <Status status={item.status} />
          </Cell>
        </tr>
      ))}
    </DataTable>
  );
}

function DataTable({
  headers,
  empty,
  children,
}: {
  headers: string[];
  empty: string;
  children: React.ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasRows)
    return (
      <div className="flex min-h-60 flex-col items-center justify-center text-muted-foreground">
        <WalletCards className="mb-3 h-8 w-8 opacity-50" />
        <p className="text-sm">{empty}</p>
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TitleCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <td className="max-w-72 px-3 py-3">
      <p className="truncate font-medium text-card-foreground">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
    </td>
  );
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td
      className={cn(
        "px-3 py-3 text-muted-foreground",
        strong && "font-semibold text-card-foreground",
      )}
    >
      {children}
    </td>
  );
}

function Status({ status }: { status: string }) {
  const good = ["successful", "completed", "approved", "converted", "scheduled", "closed"];
  const warning = [
    "pending",
    "new",
    "reviewing",
    "awaiting_response",
    "changes_requested",
    "confirmed",
  ];
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        good.includes(status) &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning.includes(status) &&
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value.includes("T") ? value : `${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
