import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Users, Calendar, Star, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout><AnalyticsContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function AnalyticsContent() {
  const [stats, setStats] = useState({ totalUsers: 0, totalAppts: 0, avgRating: 0, totalServices: 0 });
  const [roleData, setRoleData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [rolesRes, apptRes, fbRes, svcRes] = await Promise.all([
        db.from("user_roles").select("role"),
        db.from("appointments").select("status"),
        db.from("feedback").select("rating"),
        db.from("service_records").select("id", { count: "exact" }),
      ]);
      const roles = (rolesRes.data || []) as any[];
      const appts = (apptRes.data || []) as any[];
      const fbs = (fbRes.data || []) as any[];
      const avg = fbs.length ? fbs.reduce((s: number, f: any) => s + f.rating, 0) / fbs.length : 0;

      setStats({ totalUsers: roles.length, totalAppts: appts.length, avgRating: Math.round(avg * 10) / 10, totalServices: svcRes.count || 0 });

      const roleCounts: Record<string, number> = {};
      roles.forEach((r: any) => { roleCounts[r.role] = (roleCounts[r.role] || 0) + 1; });
      setRoleData(Object.entries(roleCounts).map(([name, value]) => ({ name, value })));

      const statusCounts: Record<string, number> = {};
      appts.forEach((a: any) => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
      setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    };
    load();
  }, []);

  const COLORS = ["oklch(0.55 0.18 145)", "oklch(0.65 0.16 45)", "oklch(0.50 0.15 260)", "oklch(0.75 0.15 75)"];

  return (
    <>
      <PageHeader title="Analytics" description="Platform-wide statistics" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard title="Total Appointments" value={stats.totalAppts} icon={Calendar} />
        <StatCard title="Avg Rating" value={stats.avgRating || "—"} icon={Star} />
        <StatCard title="Services Completed" value={stats.totalServices} icon={TrendingUp} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Users by Role</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Appointment Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.55 0.18 145)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
