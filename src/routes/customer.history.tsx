import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/customer/history")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><HistoryContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function HistoryContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("appointments").select("*").eq("customer_user_id", user.id).eq("status", "completed").order("scheduled_date", { ascending: false })
      .then(({ data }) => setAppointments((data || []) as any[]));
  }, [user]);

  return (
    <>
      <PageHeader title="Service History" description="Your completed services" />
      {appointments.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No completed services yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="font-semibold text-card-foreground">{appt.title}</h3>
              {appt.description && <p className="text-sm text-muted-foreground mt-1">{appt.description}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{appt.scheduled_date}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
