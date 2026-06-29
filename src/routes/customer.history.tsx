import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ServiceLifecycleStrip } from "@/components/customer/ServiceLifecycleStrip";
import { CustomerEmptyState } from "@/components/customer/CustomerEmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatDateLabel, formatTimeLabel } from "@/lib/crm-helpers";
import type { Database } from "@/types/database";
import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ClipboardList, Search, Star, Wrench } from "lucide-react";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const Route = createFileRoute("/customer/history")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <HistoryContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function HistoryContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [artisans, setArtisans] = useState<Profile[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    const [appointmentRows, artisanProfiles, feedbackRows] = await Promise.all([
      db.getMyAppointments(),
      db.getAvailableArtisans(),
      db.getMyFeedback(),
    ]);
    setAppointments(
      appointmentRows
        .filter((appointment) => appointment.status === "completed")
        .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    );
    setArtisans(artisanProfiles);
    setFeedbacks(feedbackRows);
  };

  useEffect(() => {
    void load();
    const subscriptions = [
      db.onTableChange("appointments", () => void load()),
      db.onTableChange("feedback", () => void load()),
    ];
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [user]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) => {
      const artisan = artisans.find((item) => item.id === appointment.artisan_id);
      return [
        appointment.title,
        appointment.description,
        artisan?.full_name,
        artisan?.specialization,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [appointments, artisans, search]);

  const reviewedCount = appointments.filter((appointment) =>
    feedbacks.some((feedback) => feedback.appointment_id === appointment.id),
  ).length;

  return (
    <>
      <PageHeader
        title="Service History"
        description="Receipts, repeat bookings, and reviews for completed work"
      />
      <ServiceLifecycleStrip active="history" />

      {appointments.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search completed services"
              className="pl-9"
            />
          </div>
          <div className="flex items-center rounded-xl border bg-card px-4 text-sm text-muted-foreground">
            <Star className="mr-2 h-4 w-4 text-warning" /> {reviewedCount} of {appointments.length}{" "}
            reviewed
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <CustomerEmptyState
          icon={ClipboardList}
          title={appointments.length ? "No completed services match" : "No completed services yet"}
          description={
            appointments.length
              ? "Try another service or artisan name."
              : "Completed appointments will appear here with rebooking and review actions."
          }
          action={
            !appointments.length ? (
              <Button asChild variant="outline">
                <Link to="/customer/appointments" search={{}}>
                  View appointments
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((appointment) => {
            const artisan = artisans.find((item) => item.id === appointment.artisan_id);
            const feedback = feedbacks.find((item) => item.appointment_id === appointment.id);
            return (
              <article key={appointment.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-card-foreground">{appointment.title}</h3>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateLabel(appointment.scheduled_date)} at{" "}
                      {formatTimeLabel(appointment.scheduled_time)}
                    </p>
                  </div>
                </div>

                {artisan && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <ProfileAvatar
                      src={artisan.avatar_url}
                      name={artisan.full_name}
                      className="h-9 w-9"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{artisan.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {artisan.specialization || "General services"}
                      </p>
                    </div>
                  </div>
                )}
                {appointment.description && (
                  <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                    {appointment.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/customer/appointments"
                      search={{
                        artisanId: appointment.artisan_id,
                        title: appointment.title,
                        description: appointment.description || undefined,
                      }}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" /> Book again
                    </Link>
                  </Button>
                  {feedback ? (
                    <div className="flex items-center gap-1 rounded-lg bg-warning/10 px-3 text-sm font-medium text-warning">
                      <Star className="h-4 w-4 fill-current" /> {feedback.rating}/5 reviewed
                    </div>
                  ) : (
                    <Button asChild size="sm">
                      <Link to="/customer/feedback" search={{ appointmentId: appointment.id }}>
                        <Star className="mr-2 h-4 w-4" /> Leave review
                      </Link>
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
