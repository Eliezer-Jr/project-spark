import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateLabel, formatTimeLabel, getStatusClasses } from "@/lib/crm-helpers";
import { Link } from "@tanstack/react-router";
import { Users, Calendar, Wrench, Star, Wallet, Clock3, FileText, Inbox, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/artisan/dashboard")({
  component: ArtisanDashboard,
});

function ArtisanDashboard() {
  return (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ customers: 0, appointments: 0, services: 0, avgRating: 0, revenue: 0, paid: 0, pendingPayments: 0, pending: 0, quotes: 0, requests: 0 });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [custRes, apptRes, svcRes, fbRes, quoteRes, requestRes, paymentRes] = await Promise.all([
        db.from("customers").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("appointments").select("*").eq("artisan_id", user.id).order("scheduled_date", { ascending: true }).limit(5),
        db.from("service_records").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("feedback").select("rating").eq("artisan_id", user.id),
        db.from("quotes").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("work_requests").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("payments").select("*").eq("artisan_id", user.id),
      ]);
      const ratings = (fbRes.data || []) as any[];
      const services = (svcRes.data || []) as any[];
      const appointments = (apptRes.data || []) as any[];
      const payments = (paymentRes.data || []) as any[];
      const successfulPayments = payments.filter((payment) => payment.status === "successful");
      const avg = ratings.length ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length : 0;
      setStats({
        customers: custRes.count || 0,
        appointments: appointments.length,
        services: svcRes.count || 0,
        avgRating: Math.round(avg * 10) / 10,
        revenue: services.reduce((sum: number, service: any) => sum + Number(service.cost || 0), 0),
        paid: successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        pendingPayments: payments.filter((payment) => payment.status === "pending").length,
        pending: appointments.filter((appointment: any) => appointment.status === "pending").length,
        quotes: quoteRes.count || 0,
        requests: requestRes.count || 0,
      });
      setRecentAppointments(appointments);
    };
    load();
  }, [user]);

  return (
    <>
      <PageHeader title={`Welcome, ${profile?.full_name || "Artisan"}`} description="Here's your business overview" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Customers" value={stats.customers} icon={Users} />
        <StatCard title="Upcoming Appointments" value={stats.appointments} icon={Calendar} />
        <StatCard title="Services Completed" value={stats.services} icon={Wrench} />
        <StatCard title="Avg Rating" value={stats.avgRating || "-"} icon={Star} />
        <StatCard title="Quotes" value={stats.quotes} icon={FileText} />
        <StatCard title="Requests" value={stats.requests} icon={Inbox} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Revenue Snapshot
          </div>
          <p className="mt-2 text-3xl font-semibold text-card-foreground">{formatCurrency(stats.revenue)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Based on all logged service records.</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            Customer Payments
          </div>
          <p className="mt-2 text-3xl font-semibold text-card-foreground">{formatCurrency(stats.paid)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{stats.pendingPayments} pending Redde payment requests.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            Attention Needed
          </div>
          <p className="mt-2 text-3xl font-semibold text-card-foreground">{stats.pending}</p>
          <p className="mt-1 text-sm text-muted-foreground">Pending appointments waiting for confirmation.</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-card-foreground">Quotes Workflow</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create quotes, send them for approval, and convert approved work faster.</p>
          <Link to="/artisan/quotes" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Manage Quotes</Button>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-base font-semibold text-card-foreground">Incoming Requests</h3>
          <p className="mt-1 text-sm text-muted-foreground">Track customer-requested jobs and move them into scheduled work.</p>
          <Link to="/artisan/requests" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Open Requests</Button>
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming Appointments</h2>
        {recentAppointments.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
            <Calendar className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                <div>
                  <p className="font-medium text-card-foreground">{appt.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateLabel(appt.scheduled_date)} at {formatTimeLabel(appt.scheduled_time)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(appt.status)}`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
