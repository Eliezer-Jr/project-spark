import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatDateLabel, formatStatusLabel, getStatusClasses } from "@/lib/crm-helpers";
import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/requests")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><ArtisanRequestsContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function ArtisanRequestsContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;

    const [requestRes, profileRes] = await Promise.all([
      db.from("work_requests").select("*").eq("artisan_id", user.id).order("created_at", { ascending: false }),
      db.from("profiles").select("id, full_name"),
    ]);

    setRequests((requestRes.data || []) as any[]);
    setProfiles((profileRes.data || []) as any[]);
  };

  useEffect(() => {
    void load();
    const subscription = db.onTableChange("work_requests", () => void load());
    return () => subscription.unsubscribe();
  }, [user]);

  const summary = useMemo(() => ({
    new: requests.filter((request) => request.status === "new").length,
    reviewing: requests.filter((request) => request.status === "reviewing").length,
    scheduled: requests.filter((request) => request.status === "scheduled").length,
  }), [requests]);

  const updateRequest = async (requestId: string, patch: Record<string, unknown>, message: string) => {
    const { error } = await db.from("work_requests").update(patch).eq("id", requestId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(message);
    await load();
  };

  return (
    <>
      <PageHeader title="Customer Requests" description="Review incoming work requests and turn them into scheduled work" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "New", value: summary.new },
          { label: "Reviewing", value: summary.reviewing },
          { label: "Scheduled", value: summary.scheduled },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-card-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No requests assigned to you yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const customer = profiles.find((item) => item.id === request.customer_user_id);

            return (
              <div key={request.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="xl:max-w-xl">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{request.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(request.status)}`}>
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {customer?.full_name || "Customer"}
                      {request.preferred_date ? ` · Preferred ${formatDateLabel(request.preferred_date)}` : ""}
                    </p>
                    <p className="mt-3 text-sm text-card-foreground">{request.description}</p>
                  </div>

                  <div className="grid gap-3 xl:min-w-80">
                    <div>
                      <Label>Status</Label>
                      <Select value={request.status} onValueChange={(value) => updateRequest(request.id, { status: value }, "Request status updated")}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Response Note</Label>
                      <Textarea
                        defaultValue={request.response_note || ""}
                        onBlur={(event) => {
                          const nextValue = event.target.value.trim();
                          if ((request.response_note || "") === nextValue) return;
                          void updateRequest(request.id, { response_note: nextValue || null }, "Response note saved");
                        }}
                        className="mt-1 min-h-24"
                        placeholder="Add next steps, contact notes, or scheduling details"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
