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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Calendar as CalIcon, FileText, LockKeyhole, MapPinCheck } from "lucide-react";
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
type Quote = Database["public"]["Tables"]["quotes"]["Row"];

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
  const [quotes, setQuotes] = useState<Quote[]>([]);
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
  const [quoteAppointment, setQuoteAppointment] = useState<Appointment | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    description: "",
    amount: "",
    deposit_amount: "",
    valid_until: "",
  });

  const load = async () => {
    if (!user) return;
    try {
      const [serverAppointments, custRes, quoteRes] = await Promise.all([
        db.getMyAppointments(),
        db.from("customers").select("id, name").eq("artisan_id", user.id),
        db.getMyQuotes(),
      ]);
      setAppointments(serverAppointments);
      setCustomers((custRes.data || []) as Customer[]);
      setQuotes(quoteRes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load appointments.");
    }
  };

  useEffect(() => {
    void load();
    const subscriptions = [
      db.onTableChange("appointments", () => void load()),
      db.onTableChange("quotes", () => void load()),
    ];
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
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

  const openArrivalQuote = (appointment: Appointment) => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);
    setQuoteForm({
      description: appointment.description || "",
      amount: "",
      deposit_amount: "",
      valid_until: validUntil.toISOString().slice(0, 10),
    });
    setQuoteAppointment(appointment);
  };

  const sendArrivalQuote = async () => {
    if (!user || !quoteAppointment?.customer_user_id || !quoteForm.amount) return;
    const amount = Number(quoteForm.amount);
    const deposit = quoteForm.deposit_amount ? Number(quoteForm.deposit_amount) : null;
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid quote amount.");
      return;
    }
    if (deposit !== null && (!Number.isFinite(deposit) || deposit < 0 || deposit > amount)) {
      toast.error("Deposit must be between zero and the total amount.");
      return;
    }

    try {
      await db.createQuote({
        customer_id: quoteAppointment.customer_id,
        customer_user_id: quoteAppointment.customer_user_id,
        appointment_id: quoteAppointment.id,
        title: quoteAppointment.title,
        description: quoteForm.description.trim() || quoteAppointment.description,
        amount,
        deposit_amount: deposit,
        status: "awaiting_response",
        requested_changes: null,
        valid_until: quoteForm.valid_until || null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send quote.");
      return;
    }
    toast.success("Quote sent to the customer");
    setQuoteAppointment(null);
    await load();
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
            const arrivalQuote = quotes.find((quote) => quote.appointment_id === appt.id);
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
                  {appt.status === "confirmed" &&
                    appt.journey_status === "arrived" &&
                    appt.customer_user_id &&
                    (arrivalQuote ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                        <FileText className="h-3.5 w-3.5" /> Quote sent
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openArrivalQuote(appt)}>
                        <FileText className="mr-2 h-4 w-4" /> Send quote
                      </Button>
                    ))}
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
                  {(appt.status === "pending" || appt.status === "confirmed") && !arrivalQuote && (
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
                  {arrivalQuote && appt.status !== "completed" && (
                    <p className="flex w-full items-center justify-end gap-1.5 text-right text-xs text-muted-foreground">
                      <LockKeyhole className="h-3.5 w-3.5 text-primary" /> Quote sent · cancellation
                      locked
                    </p>
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

      <Dialog
        open={Boolean(quoteAppointment)}
        onOpenChange={(open) => !open && setQuoteAppointment(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send an arrival quote</DialogTitle>
          </DialogHeader>
          {quoteAppointment && (
            <div className="mt-2 space-y-4">
              <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <MapPinCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Arrival confirmed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quoteAppointment.title} · This quote will be linked to this appointment.
                  </p>
                </div>
              </div>
              <div>
                <Label>Work and materials</Label>
                <Textarea
                  value={quoteForm.description}
                  onChange={(event) =>
                    setQuoteForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="mt-1 min-h-24"
                  placeholder="Describe the confirmed scope, materials, and labour."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total amount (GHS) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteForm.amount}
                    onChange={(event) =>
                      setQuoteForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Deposit (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quoteForm.deposit_amount}
                    onChange={(event) =>
                      setQuoteForm((current) => ({
                        ...current,
                        deposit_amount: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Valid until</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={quoteForm.valid_until}
                  onChange={(event) =>
                    setQuoteForm((current) => ({ ...current, valid_until: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <Button className="w-full" disabled={!quoteForm.amount} onClick={() => void sendArrivalQuote()}>
                <FileText className="mr-2 h-4 w-4" /> Send quote to customer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
