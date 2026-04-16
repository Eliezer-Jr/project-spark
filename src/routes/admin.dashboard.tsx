import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Users, Calendar, Wrench, Star, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout><AdminDashContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function AdminDashContent() {
  const [stats, setStats] = useState({ users: 0, artisans: 0, customers: 0, appointments: 0, services: 0 });

  useEffect(() => {
    const load = async () => {
      const [rolesRes, apptRes, svcRes] = await Promise.all([
        db.from("user_roles").select("role"),
        db.from("appointments").select("id", { count: "exact" }),
        db.from("service_records").select("id", { count: "exact" }),
      ]);
      const roles = (rolesRes.data || []) as any[];
      setStats({
        users: roles.length,
        artisans: roles.filter((r: any) => r.role === "artisan").length,
        customers: roles.filter((r: any) => r.role === "customer").length,
        appointments: apptRes.count || 0,
        services: svcRes.count || 0,
      });
    };
    load();
  }, []);

  const chartData = [
    { name: "Artisans", value: stats.artisans },
    { name: "Customers", value: stats.customers },
    { name: "Appointments", value: stats.appointments },
    { name: "Services", value: stats.services },
  ];

  return (
    <>
      <PageHeader title="Admin Dashboard" description="Platform overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.users} icon={Users} />
        <StatCard title="Artisans" value={stats.artisans} icon={Wrench} />
        <StatCard title="Customers" value={stats.customers} icon={Users} />
        <StatCard title="Appointments" value={stats.appointments} icon={Calendar} />
      </div>
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Platform Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="oklch(0.55 0.18 145)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
