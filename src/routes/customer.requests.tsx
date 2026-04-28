import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatDateLabel, formatStatusLabel, getStatusClasses } from "@/lib/crm-helpers";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
type WorkRequest = Database["public"]["Tables"]["work_requests"]["Row"];

export const Route = createFileRoute("/customer/requests")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <CustomerRequestsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomerRequestsContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [artisans, setArtisans] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    artisan_id: "",
    title: "",
    description: "",
    preferred_date: "",
  });

  const load = async () => {
    if (!user) return;

    const [requestRes, roleRes] = await Promise.all([
      db
        .from("work_requests")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false }),
      db.from("user_roles").select("user_id").eq("role", "artisan"),
    ]);

    setRequests((requestRes.data || []) as WorkRequest[]);

    const artisanIds = ((roleRes.data || []) as UserRole[]).map((item) => item.user_id);
    if (artisanIds.length) {
      const { data } = await db.from("profiles").select("*").in("id", artisanIds);
      setArtisans((data || []) as Profile[]);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.description.trim()) return;

    const { error } = await db.from("work_requests").insert({
      artisan_id: form.artisan_id || null,
      customer_user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      preferred_date: form.preferred_date || null,
      status: "new",
      response_note: null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Service request submitted");
    setDialogOpen(false);
    setForm({ artisan_id: "", title: "", description: "", preferred_date: "" });
    await load();
  };

  return (
    <>
      <PageHeader
        title="Service Requests"
        description="Request additional work without waiting for a call back"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request More Work</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Preferred Artisan</Label>
                  <Select
                    value={form.artisan_id}
                    onValueChange={(value) => setForm({ ...form, artisan_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Any available artisan" />
                    </SelectTrigger>
                    <SelectContent>
                      {artisans.map((artisan) => (
                        <SelectItem key={artisan.id} value={artisan.id}>
                          {artisan.full_name} - {artisan.specialization || "General"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Request Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className="mt-1 min-h-24"
                  />
                </div>
                <div>
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={form.preferred_date}
                    onChange={(event) => setForm({ ...form, preferred_date: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {requests.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Inbox className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No service requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const artisan = artisans.find((item) => item.id === request.artisan_id);

            return (
              <div key={request.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{request.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(request.status)}`}
                      >
                        {formatStatusLabel(request.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {request.preferred_date
                        ? `Preferred ${formatDateLabel(request.preferred_date)}`
                        : "No preferred date"}
                    </p>
                    {artisan ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <ProfileAvatar
                          src={artisan.avatar_url}
                          name={artisan.full_name}
                          className="h-7 w-7 shrink-0"
                          fallbackClassName="text-xs"
                        />
                        <span>
                          {artisan.full_name}
                          {artisan.specialization ? ` - ${artisan.specialization}` : ""}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">Unassigned artisan</p>
                    )}
                    <p className="mt-3 text-sm text-card-foreground">{request.description}</p>
                    {request.response_note && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Response: {request.response_note}
                      </p>
                    )}
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
