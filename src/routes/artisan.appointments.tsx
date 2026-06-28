import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContactPanel } from "@/components/ContactPanel";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { LiveServiceTracker } from "@/components/appointments/LiveServiceTracker";
import { AppointmentProgress } from "@/components/appointments/AppointmentProgress";
import type { Database } from "@/types/database";
import { Check, CheckCircle2, XCircle } from "lucide-react";
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
import { formatDateLabel, formatTimeLabel, getStatusClasses } from "@/lib/crm-helpers";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

export const Route = createFileRoute("/artisan/appointments")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout>
        <AppointmentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function AppointmentsContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    customer_id: "",
    scheduled_date: "",
    scheduled_time: "",
    status: "pending",
  });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    try {
      const [serverAppointments, custRes] = await Promise.all([
        db.getMyAppointments(),
        db.from("customers").select("id, name").eq("artisan_id", user.id),
      ]);
      setAppointments(serverAppointments);
      setCustomers((custRes.data || []) as Customer[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load appointments.");
    }
  };

  useEffect(() => {
    void load();
    const subscription = db.onTableChange("appointments", () => void load());
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, [user]);

  const handleSave = async () => {
    if (!user || !form.title || !form.scheduled_date || !form.scheduled_time) return;
    try {
      await db.createAppointment({
        artisan_id: user.id,
        customer_id: form.customer_id || null,
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        status: "confirmed",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create appointment.");
      return;
    }
    toast.success("Appointment created");
    setDialogOpen(false);
    setForm({
      title: "",
      description: "",
      customer_id: "",
      scheduled_date: "",
      scheduled_time: "",
      status: "pending",
    });
    load();
  };

  const updateStatus = async (
    appointment: Appointment,
    status: Appointment["status"],
    successMessage: string,
  ) => {
    setSavingId(appointment.id);
    try {
      await db.updateAppointment(appointment.id, { status });
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update appointment.");
    } finally {
      setSavingId(null);
    }
  };

  const filtered =
    filter === "all" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Manage your schedule"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Appointment</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={form.customer_id}
                    onValueChange={(v) => setForm({ ...form, customer_id: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.scheduled_date}
                      onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={form.scheduled_time}
                      onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button onClick={handleSave} className="w-full">
                  Create Appointment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <CalIcon className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const isSaving = savingId === appt.id;
            const canComplete = !appt.customer_user_id || appt.journey_status === "arrived";
            return (
              <div
                key={appt.id}
                className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{appt.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(appt.status)}`}
                    >
                      {appt.status}
                    </span>
                  </div>
                  {appt.description && (
                    <p className="text-sm text-muted-foreground">{appt.description}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateLabel(appt.scheduled_date)} at {formatTimeLabel(appt.scheduled_time)}
                  </p>
                  <AppointmentProgress appointment={appt} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {appt.customer_user_id && (
                    <ContactPanel
                      participantId={appt.customer_user_id}
                      contextLabel={appt.title}
                      appointmentId={appt.id}
                    />
                  )}
                  {appt.status === "pending" && (
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={() =>
                        void updateStatus(
                          appt,
                          "confirmed",
                          "Appointment accepted — customer notified",
                        )
                      }
                    >
                      <Check className="mr-2 h-4 w-4" /> Accept
                    </Button>
                  )}
                  {appt.status === "confirmed" && (
                    <LiveServiceTracker
                      appointment={appt}
                      role="artisan"
                      onAppointmentChange={load}
                    />
                  )}
                  {appt.status === "confirmed" && (
                    <Button
                      size="sm"
                      disabled={isSaving || !canComplete}
                      title={canComplete ? "Complete service" : "Confirm arrival first"}
                      onClick={() =>
                        void updateStatus(
                          appt,
                          "completed",
                          "Service completed — customer can now leave feedback",
                        )
                      }
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                    </Button>
                  )}
                  {(appt.status === "pending" || appt.status === "confirmed") && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={isSaving}
                        >
                          <XCircle className="mr-2 h-4 w-4" />{" "}
                          {appt.status === "pending" ? "Decline" : "Cancel"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {appt.status === "pending"
                              ? "Decline this request?"
                              : "Cancel this appointment?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            The customer will be notified immediately. This action cannot be
                            reversed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              void updateStatus(
                                appt,
                                "cancelled",
                                appt.status === "pending"
                                  ? "Request declined"
                                  : "Appointment cancelled",
                              )
                            }
                          >
                            Confirm
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {appt.status === "confirmed" && !canComplete && (
                    <p className="w-full text-right text-xs text-muted-foreground">
                      Confirm arrival before completing.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
