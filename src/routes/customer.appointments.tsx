import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ContactPanel } from "@/components/ContactPanel";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import {
  formatDateLabel,
  formatTimeLabel,
  getAvailableTimeSuggestions,
  getStatusClasses,
} from "@/lib/crm-helpers";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Sparkles, XCircle, Clock3, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/types/database";
import { LiveServiceTracker } from "@/components/appointments/LiveServiceTracker";
import { ServiceLifecycleStrip } from "@/components/customer/ServiceLifecycleStrip";
import { CustomerEmptyState } from "@/components/customer/CustomerEmptyState";
import { AppointmentProgress } from "@/components/appointments/AppointmentProgress";
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

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const appointmentSearchSchema = z.object({
  artisanId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const Route = createFileRoute("/customer/appointments")({
  validateSearch: appointmentSearchSchema,
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <CustAppointmentsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustAppointmentsContent() {
  const navigate = useNavigate({ from: "/customer/appointments" });
  const search = Route.useSearch();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [artisans, setArtisans] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    artisan_id: "",
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
  });
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const journeyStatusesRef = useRef<Map<string, Appointment["journey_status"]>>(new Map());
  const hasLoadedJourneyStatusesRef = useRef(false);

  const load = async () => {
    if (!user) return;

    try {
      const localAppointmentsRes = await db
        .from("appointments")
        .select("*")
        .eq("customer_user_id", user.id);
      const [serverAppointments, serverArtisans] = await Promise.all([
        db.getMyAppointments(),
        db.getAvailableArtisans(),
      ]);
      const serverArtisanIds = new Set(serverArtisans.map((artisan) => artisan.id));
      const mergedAppointments = [...serverAppointments];

      for (const localAppointment of (localAppointmentsRes.data || []) as Appointment[]) {
        if (
          serverAppointments.some((appointment) => appointment.id === localAppointment.id) ||
          !serverArtisanIds.has(localAppointment.artisan_id)
        ) {
          continue;
        }

        const existingServerBooking = mergedAppointments.find(
          (appointment) =>
            appointment.artisan_id === localAppointment.artisan_id &&
            appointment.title === localAppointment.title &&
            appointment.scheduled_date === localAppointment.scheduled_date &&
            appointment.scheduled_time.slice(0, 5) === localAppointment.scheduled_time.slice(0, 5),
        );

        if (existingServerBooking) {
          db.discardCachedAppointment(localAppointment.id);
          continue;
        }

        try {
          const migrated = await db.createAppointment({
            artisan_id: localAppointment.artisan_id,
            category_id: localAppointment.category_id,
            title: localAppointment.title,
            description: localAppointment.description,
            scheduled_date: localAppointment.scheduled_date,
            scheduled_time: localAppointment.scheduled_time,
          });
          mergedAppointments.push(migrated);
          db.discardCachedAppointment(localAppointment.id);
        } catch (error) {
          console.error("Could not migrate a local appointment:", error);
        }
      }

      const previousJourneyStatuses = journeyStatusesRef.current;
      if (hasLoadedJourneyStatusesRef.current) {
        for (const appointment of mergedAppointments) {
          if (
            appointment.journey_status === "arrived" &&
            previousJourneyStatuses.get(appointment.id) !== "arrived"
          ) {
            const artisan = serverArtisans.find((item) => item.id === appointment.artisan_id);
            toast.success(`${artisan?.full_name || "Your artisan"} has arrived`, {
              description: `They are at the service location for ${appointment.title}.`,
              duration: 10_000,
            });
          }
        }
      }
      journeyStatusesRef.current = new Map(
        mergedAppointments.map((appointment) => [appointment.id, appointment.journey_status]),
      );
      hasLoadedJourneyStatusesRef.current = true;

      setAppointments(mergedAppointments);
      setAllAppointments(mergedAppointments);
      setArtisans(serverArtisans);
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

  useEffect(() => {
    if (!search.artisanId) return;

    setForm((current) => ({
      ...current,
      artisan_id: search.artisanId ?? "",
      title: search.title ?? current.title,
      description: search.description ?? current.description,
      scheduled_date: search.date ?? current.scheduled_date,
    }));
    setDialogOpen(true);
  }, [search.artisanId, search.date, search.description, search.title]);

  const selectedArtisan = artisans.find((artisan) => artisan.id === form.artisan_id) ?? null;

  const artisanAppointments = useMemo(
    () => allAppointments.filter((appointment) => appointment.artisan_id === form.artisan_id),
    [allAppointments, form.artisan_id],
  );

  const suggestedSlots = useMemo(
    () =>
      form.scheduled_date
        ? getAvailableTimeSuggestions(artisanAppointments, form.scheduled_date, 5)
        : [],
    [artisanAppointments, form.scheduled_date],
  );

  const appointmentConflict = useMemo(
    () =>
      allAppointments.find(
        (appointment) =>
          appointment.artisan_id === form.artisan_id &&
          appointment.scheduled_date === form.scheduled_date &&
          appointment.scheduled_time.slice(0, 5) === form.scheduled_time &&
          (appointment.status === "pending" || appointment.status === "confirmed"),
      ) ?? null,
    [allAppointments, form],
  );

  const filteredAppointments = appointments.filter((appointment) => {
    if (filter === "all") return true;
    if (filter === "completed") return appointment.status === "completed";
    if (filter === "cancelled") return appointment.status === "cancelled";
    return appointment.status === "pending" || appointment.status === "confirmed";
  });

  const handleBook = async () => {
    if (!user || !form.artisan_id || !form.title || !form.scheduled_date || !form.scheduled_time)
      return;

    if (appointmentConflict) {
      toast.error("That time slot is already taken. Try one of the suggested times.");
      return;
    }

    try {
      await db.createAppointment({
        artisan_id: form.artisan_id,
        title: form.title,
        description: form.description || null,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not book appointment.");
      return;
    }

    // The appointment is already safe. Related lifecycle updates are best-effort and must not
    // make a successful booking look like it failed.
    try {
      const [quoteRes, requestRes] = await Promise.all([
        db.from("quotes").select("*").eq("customer_user_id", user.id),
        db.from("work_requests").select("*").eq("customer_user_id", user.id),
      ]);
      const matchingQuote = (quoteRes.data || []).find(
        (quote) =>
          quote.artisan_id === form.artisan_id &&
          quote.title.trim().toLowerCase() === form.title.trim().toLowerCase() &&
          quote.status === "approved",
      );
      const matchingRequest = (requestRes.data || []).find(
        (request) =>
          request.artisan_id === form.artisan_id &&
          request.title.trim().toLowerCase() === form.title.trim().toLowerCase() &&
          request.status !== "closed",
      );
      await Promise.all([
        matchingQuote
          ? db.from("quotes").update({ status: "converted" }).eq("id", matchingQuote.id)
          : Promise.resolve(null),
        matchingRequest
          ? db.from("work_requests").update({ status: "scheduled" }).eq("id", matchingRequest.id)
          : Promise.resolve(null),
      ]);
    } catch (error) {
      console.error("Could not advance related service records:", error);
    }

    toast.success("Appointment booked!");
    setDialogOpen(false);
    setForm({ artisan_id: "", title: "", description: "", scheduled_date: "", scheduled_time: "" });
    await navigate({ search: {} });
    await load();
  };

  const cancelAppointment = async (id: string) => {
    try {
      await db.updateAppointment(id, { status: "cancelled" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel appointment.");
      return;
    }

    toast.success("Appointment cancelled");
    await load();
  };

  return (
    <>
      <PageHeader
        title="My Appointments"
        description="Book, monitor, and manage your service visits"
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setForm({
                  artisan_id: "",
                  title: "",
                  description: "",
                  scheduled_date: "",
                  scheduled_time: "",
                });
                void navigate({ search: {} });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Book Appointment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Artisan *</Label>
                  <Select
                    value={form.artisan_id}
                    onValueChange={(value) => setForm({ ...form, artisan_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select artisan" />
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

                {selectedArtisan && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfileAvatar
                          src={selectedArtisan.avatar_url}
                          name={selectedArtisan.full_name}
                          className="h-10 w-10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {selectedArtisan.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedArtisan.specialization || "General services"}
                            {selectedArtisan.location ? ` in ${selectedArtisan.location}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        Suggested booking
                      </Badge>
                    </div>
                    {selectedArtisan.bio && (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedArtisan.bio}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Service Needed *</Label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="e.g. Fix leaking pipe"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Details</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the issue or what you need done."
                    className="mt-1 min-h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.scheduled_date}
                      onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={form.scheduled_time}
                      onChange={(event) => setForm({ ...form, scheduled_time: event.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                {form.scheduled_date && (
                  <div className="rounded-xl border border-dashed bg-background p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Clock3 className="h-4 w-4" />
                      Available suggestions for {formatDateLabel(form.scheduled_date)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestedSlots.length ? (
                        suggestedSlots.map((slot) => (
                          <Button
                            key={slot}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setForm({ ...form, scheduled_time: slot })}
                          >
                            {formatTimeLabel(slot)}
                          </Button>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No open suggestions for this date.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {appointmentConflict && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    This artisan already has an active booking at that time. Choose another
                    suggestion to continue.
                  </div>
                )}

                <Button onClick={handleBook} className="w-full">
                  Book Now
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <ServiceLifecycleStrip active="appointment" />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "upcoming", label: "Upcoming" },
          { key: "completed", label: "Completed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as typeof filter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === item.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredAppointments.length === 0 ? (
        <CustomerEmptyState
          icon={Calendar}
          title="No appointments in this view"
          description="Browse verified artisans or turn an approved quote into a scheduled visit."
          action={
            <Button asChild variant="outline">
              <Link to="/customer/browse">Browse artisans</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const artisan = artisans.find((item) => item.id === appointment.artisan_id);
            const canCancel =
              appointment.status === "pending" || appointment.status === "confirmed";

            return (
              <div key={appointment.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{appointment.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(appointment.status)}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateLabel(appointment.scheduled_date)} at{" "}
                      {formatTimeLabel(appointment.scheduled_time)}
                    </p>
                    {artisan && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <ProfileAvatar
                          src={artisan.avatar_url}
                          name={artisan.full_name}
                          className="h-7 w-7 shrink-0"
                          fallbackClassName="text-xs"
                        />
                        <span>
                          With {artisan.full_name}
                          {artisan.specialization ? ` - ${artisan.specialization}` : ""}
                        </span>
                      </div>
                    )}
                    {appointment.description && (
                      <p className="mt-3 text-sm text-card-foreground">{appointment.description}</p>
                    )}
                    <AppointmentProgress appointment={appointment} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ContactPanel
                      participantId={appointment.artisan_id}
                      contextLabel={appointment.title}
                      appointmentId={appointment.id}
                    />
                    <LiveServiceTracker appointment={appointment} role="customer" />
                    {canCancel && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <XCircle className="h-4 w-4" /> Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The artisan will be notified and the reserved time will be released.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void cancelAppointment(appointment.id)}
                            >
                              Cancel appointment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {appointment.status === "completed" && (
                      <Button asChild size="sm">
                        <Link to="/customer/feedback" search={{ appointmentId: appointment.id }}>
                          <Star className="mr-2 h-4 w-4" /> Leave feedback
                        </Link>
                      </Button>
                    )}
                    {(appointment.status === "completed" || appointment.status === "cancelled") && (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to="/customer/appointments"
                          search={{
                            artisanId: appointment.artisan_id,
                            title: appointment.title,
                            description: appointment.description || undefined,
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Book again
                        </Link>
                      </Button>
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
