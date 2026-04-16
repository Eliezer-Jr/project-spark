import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Calendar, ClipboardList, MessageSquare, Search } from "lucide-react";

export const Route = createFileRoute("/customer/dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustomerDashContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomerDashContent() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, completed: 0, feedbacks: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [apptRes, compRes, fbRes] = await Promise.all([
        db.from("appointments").select("id", { count: "exact" }).eq("customer_user_id", user.id),
        db.from("appointments").select("id", { count: "exact" }).eq("customer_user_id", user.id).eq("status", "completed"),
        db.from("feedback").select("id", { count: "exact" }).eq("customer_user_id", user.id),
      ]);
      setStats({ appointments: apptRes.count || 0, completed: compRes.count || 0, feedbacks: fbRes.count || 0 });
    };
    load();
  }, [user]);

  return (
    <>
      <PageHeader title={`Hello, ${profile?.full_name || "Customer"}`} description="Your service overview" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Bookings" value={stats.appointments} icon={Calendar} />
        <StatCard title="Completed Services" value={stats.completed} icon={ClipboardList} />
        <StatCard title="Reviews Given" value={stats.feedbacks} icon={MessageSquare} />
      </div>
      <div className="mt-8 rounded-xl border bg-card p-8 text-center">
        <Search className="mx-auto h-10 w-10 mb-3 text-primary" />
        <h3 className="text-lg font-semibold text-card-foreground">Find an Artisan</h3>
        <p className="mt-1 text-sm text-muted-foreground">Browse skilled service providers in your area</p>
      </div>
    </>
  );
}
