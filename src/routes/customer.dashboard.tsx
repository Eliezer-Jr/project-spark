import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ClipboardList, MessageSquare, Search, FileText, Inbox } from "lucide-react";

export const Route = createFileRoute("/customer/dashboard")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustomerDashContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomerDashContent() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, completed: 0, feedbacks: 0, quotes: 0, requests: 0 });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [apptRes, compRes, fbRes, quoteRes, requestRes] = await Promise.all([
        db.from("appointments").select("id", { count: "exact" }).eq("customer_user_id", user.id),
        db.from("appointments").select("id", { count: "exact" }).eq("customer_user_id", user.id).eq("status", "completed"),
        db.getMyFeedback(),
        db.getMyQuotes(),
        db.from("work_requests").select("id", { count: "exact" }).eq("customer_user_id", user.id),
      ]);
      setStats({
        appointments: apptRes.count || 0,
        completed: compRes.count || 0,
        feedbacks: fbRes.length,
        quotes: quoteRes.length,
        requests: requestRes.count || 0,
      });
    };
    load();
  }, [user]);

  return (
    <>
      <PageHeader title={`Hello, ${profile?.full_name || "Customer"}`} description="Your service overview" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Bookings" value={stats.appointments} icon={Calendar} />
        <StatCard title="Completed Services" value={stats.completed} icon={ClipboardList} />
        <StatCard title="Reviews Given" value={stats.feedbacks} icon={MessageSquare} />
        <StatCard title="Quotes" value={stats.quotes} icon={FileText} />
        <StatCard title="Requests" value={stats.requests} icon={Inbox} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-8 text-center">
          <Search className="mx-auto h-10 w-10 mb-3 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Find an Artisan</h3>
          <p className="mt-1 text-sm text-muted-foreground">Browse skilled service providers in your area</p>
          <Link to="/customer/browse" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Browse Now</Button>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center">
          <FileText className="mx-auto h-10 w-10 mb-3 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Review Quotes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Approve estimates or request edits directly from your portal.</p>
          <Link to="/customer/quotes" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Open Quotes</Button>
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center">
          <Inbox className="mx-auto h-10 w-10 mb-3 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Request More Work</h3>
          <p className="mt-1 text-sm text-muted-foreground">Submit new service requests without calling the artisan first.</p>
          <Link to="/customer/requests" className="mt-4 inline-block">
            <Button variant="outline" size="sm">Create Request</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
