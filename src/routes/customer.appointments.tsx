import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import {
  formatDateLabel,
  formatTimeLabel,
  getAvailableTimeSuggestions,
  getStatusClasses,
} from "@/lib/crm-helpers";
import { useEffect, useMemo, useState } from "react";
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
import { Plus, Calendar, Sparkles, XCircle, Clock3 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

const appointmentSearchSchema = z.object({
  artisanId: z.string().optional(),
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

  const load = async () => {
    if (!user) return;

    const [customerAppointmentsRes, allAppointmentsRes] = await Promise.all([
      db
        .from("appointments")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("scheduled_date", { ascending: false }),
      db.from("appointments").select("*"),
    ]);
    setAppointments((customerAppointmentsRes.data || []) as Appointment[]);
    setAllAppointments((allAppointmentsRes.data || []) as Appointment[]);

    const rolesRes = await db.from("user_roles").select("user_id").eq("role", "artisan");
    const ids = ((rolesRes.data || []) as UserRole[]).map((role) => role.user_id);
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("*").in("id", ids);
      setArtisans((profiles || []) as Profile[]);
    }
  };

  useEffect(() => {
    void load();
    const subscription = db.onTableChange("appointments", () => void load());
    return () => subscription.unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!search.artisanId) return;

    setForm((current) => ({ ...current, artisan_id: search.artisanId ?? "" }));
    setDialogOpen(true);
  }, [search.artisanId]);

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

    const { error } = await db.from("appointments").insert({
      artisan_id: form.artisan_id,
      customer_user_id: user.id,
      title: form.title,
      description: form.description || null,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Appointment booked!");
    setDialogOpen(false);
    setForm({ artisan_id: "", title: "", description: "", scheduled_date: "", scheduled_time: "" });
    await navigate({ search: {} });
    await load();
  };

  const cancelAppointment = async (id: string) => {
    const { error } = await db.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast.error(error.message);
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
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Calendar className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No appointments in this view yet</p>
        </div>
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
                  </div>

                  {canCancel && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => cancelAppointment(appointment.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
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
