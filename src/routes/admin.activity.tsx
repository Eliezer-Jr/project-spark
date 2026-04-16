import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/admin/activity")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout><ActivityContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function ActivityContent() {
  const [recentAppts, setRecentAppts] = useState<any[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [apptRes, fbRes] = await Promise.all([
        db.from("appointments").select("*").order("created_at", { ascending: false }).limit(10),
        db.from("feedback").select("*").order("created_at", { ascending: false }).limit(10),
      ]);
      setRecentAppts((apptRes.data || []) as any[]);
      setRecentFeedback((fbRes.data || []) as any[]);
    };
    load();
  }, []);

  return (
    <>
      <PageHeader title="Recent Activity" description="Latest platform activity" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Appointments</h3>
          {recentAppts.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No recent appointments</div>
          ) : (
            <div className="space-y-2">
              {recentAppts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <div>
                    <p className="font-medium text-card-foreground text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.scheduled_date}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    a.status === "confirmed" ? "bg-success/10 text-success" :
                    a.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Feedback</h3>
          {recentFeedback.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No recent feedback</div>
          ) : (
            <div className="space-y-2">
              {recentFeedback.map((f) => (
                <div key={f.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < f.rating ? "text-warning" : "text-muted"}`}>★</span>
                    ))}
                  </div>
                  {f.comment && <p className="text-sm text-card-foreground">{f.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
