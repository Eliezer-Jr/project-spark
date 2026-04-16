import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { Users, Calendar, Wrench, Star } from "lucide-react";
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
  const [stats, setStats] = useState({ customers: 0, appointments: 0, services: 0, avgRating: 0 });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [custRes, apptRes, svcRes, fbRes] = await Promise.all([
        db.from("customers").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("appointments").select("*").eq("artisan_id", user.id).order("scheduled_date", { ascending: true }).limit(5),
        db.from("service_records").select("id", { count: "exact" }).eq("artisan_id", user.id),
        db.from("feedback").select("rating").eq("artisan_id", user.id),
      ]);
      const ratings = (fbRes.data || []) as any[];
      const avg = ratings.length ? ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length : 0;
      setStats({
        customers: custRes.count || 0,
        appointments: (apptRes.data || []).length,
        services: svcRes.count || 0,
        avgRating: Math.round(avg * 10) / 10,
      });
      setRecentAppointments((apptRes.data || []) as any[]);
    };
    load();
  }, [user]);

  return (
    <>
      <PageHeader title={`Welcome, ${profile?.full_name || "Artisan"}`} description="Here's your business overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Customers" value={stats.customers} icon={Users} />
        <StatCard title="Upcoming Appointments" value={stats.appointments} icon={Calendar} />
        <StatCard title="Services Completed" value={stats.services} icon={Wrench} />
        <StatCard title="Avg Rating" value={stats.avgRating || "—"} icon={Star} />
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
                  <p className="text-sm text-muted-foreground">{appt.scheduled_date} at {appt.scheduled_time}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  appt.status === "confirmed" ? "bg-success/10 text-success" :
                  appt.status === "pending" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
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
