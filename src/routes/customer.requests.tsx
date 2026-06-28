import { createFileRoute, Link } from "@tanstack/react-router";
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
import { ArrowRight, CalendarPlus, Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/types/database";
import { ServiceLifecycleStrip } from "@/components/customer/ServiceLifecycleStrip";
import { CustomerEmptyState } from "@/components/customer/CustomerEmptyState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
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
  const [filter, setFilter] = useState<"all" | WorkRequest["status"]>("all");
  const [form, setForm] = useState({
    artisan_id: "",
    title: "",
    description: "",
    preferred_date: "",
  });

  const load = async () => {
    if (!user) return;

    const [requestRes, availableArtisans] = await Promise.all([
      db
        .from("work_requests")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false }),
      db.getAvailableArtisans(),
    ]);

    setRequests((requestRes.data || []) as WorkRequest[]);

    setArtisans(availableArtisans);
  };

  useEffect(() => {
    void load();
    const subscription = db.onTableChange("work_requests", () => void load());
    return () => subscription.unsubscribe();
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

  const withdrawRequest = async (id: string) => {
    const { error } = await db.from("work_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Request withdrawn");
    await load();
  };

  const filteredRequests =
    filter === "all" ? requests : requests.filter((request) => request.status === filter);

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

      <ServiceLifecycleStrip active="request" />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "new", "reviewing", "scheduled", "closed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {status === "all" ? "All" : formatStatusLabel(status)}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <CustomerEmptyState
          icon={Inbox}
          title={requests.length ? "No requests match this filter" : "No service requests yet"}
          description="Describe the work once and let an artisan respond with next steps."
          action={
            !requests.length ? (
              <Button onClick={() => setDialogOpen(true)}>Create request</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const artisan = artisans.find((item) => item.id === request.artisan_id);

            return (
              <div key={request.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                        <p className="font-medium text-primary">Artisan response</p>
                        <p className="mt-1 text-muted-foreground">{request.response_note}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {(request.status === "reviewing" || request.response_note) && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/customer/quotes">
                          View quotes <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {request.artisan_id && request.status !== "closed" && (
                      <Button asChild size="sm">
                        <Link
                          to="/customer/appointments"
                          search={{
                            artisanId: request.artisan_id,
                            title: request.title,
                            description: request.description,
                            date: request.preferred_date || undefined,
                          }}
                        >
                          <CalendarPlus className="mr-2 h-4 w-4" /> Book visit
                        </Link>
                      </Button>
                    )}
                    {request.status === "new" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Withdraw
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes it before an artisan starts reviewing it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep request</AlertDialogCancel>
                            <AlertDialogAction onClick={() => void withdrawRequest(request.id)}>
                              Withdraw
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
