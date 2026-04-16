import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatDateLabel } from "@/lib/crm-helpers";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/feedback")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustFeedbackContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustFeedbackContent() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [artisans, setArtisans] = useState<any[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ appointment_id: "", rating: "5", comment: "" });

  const load = async () => {
    if (!user) return;

    const [feedbackRes, appointmentRes, rolesRes] = await Promise.all([
      db.from("feedback").select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false }),
      db.from("appointments").select("*").eq("customer_user_id", user.id).eq("status", "completed").order("scheduled_date", { ascending: false }),
      db.from("user_roles").select("user_id").eq("role", "artisan"),
    ]);

    setFeedbacks((feedbackRes.data || []) as any[]);
    setCompletedAppointments((appointmentRes.data || []) as any[]);

    const ids = ((rolesRes.data || []) as any[]).map((role: any) => role.user_id);
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, full_name, specialization").in("id", ids);
      setArtisans((profiles || []) as any[]);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const eligibleAppointments = useMemo(
    () =>
      completedAppointments.filter(
        (appointment) => !feedbacks.some((feedback) => feedback.appointment_id === appointment.id),
      ),
    [completedAppointments, feedbacks],
  );

  const selectedAppointment = eligibleAppointments.find((appointment) => appointment.id === form.appointment_id) ?? null;
  const selectedArtisan = artisans.find((artisan) => artisan.id === selectedAppointment?.artisan_id) ?? null;

  const handleSubmit = async () => {
    if (!user || !selectedAppointment) return;

    const { error } = await db.from("feedback").insert({
      artisan_id: selectedAppointment.artisan_id,
      customer_user_id: user.id,
      appointment_id: selectedAppointment.id,
      rating: parseInt(form.rating, 10),
      comment: form.comment || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Feedback submitted!");
    setDialogOpen(false);
    setForm({ appointment_id: "", rating: "5", comment: "" });
    await load();
  };

  return (
    <>
      <PageHeader
        title="My Feedback"
        description="Reviews linked to completed appointments"
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setForm({ appointment_id: "", rating: "5", comment: "" });
              }
            }}
          >
            <DialogTrigger asChild><Button disabled={!eligibleAppointments.length}><Plus className="mr-2 h-4 w-4" /> Leave Feedback</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Leave Feedback</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Completed Appointment *</Label>
                  <Select value={form.appointment_id} onValueChange={(value) => setForm({ ...form, appointment_id: value })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select completed appointment" /></SelectTrigger>
                    <SelectContent>
                      {eligibleAppointments.map((appointment) => {
                        const artisan = artisans.find((item) => item.id === appointment.artisan_id);
                        return (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {appointment.title} - {artisan?.full_name || "Artisan"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAppointment && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{selectedAppointment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedArtisan?.full_name || "Artisan"}
                          {selectedArtisan?.specialization ? ` - ${selectedArtisan.specialization}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {formatDateLabel(selectedAppointment.scheduled_date)}
                      </Badge>
                    </div>
                    {selectedAppointment.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{selectedAppointment.description}</p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" onClick={() => setForm({ ...form, rating: String(value) })}>
                        <Star className={`h-6 w-6 ${value <= parseInt(form.rating, 10) ? "fill-warning text-warning" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Comment</Label>
                  <Textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="Share your experience..." className="mt-1 min-h-24" />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!selectedAppointment}>Submit Feedback</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {!eligibleAppointments.length && (
        <div className="mb-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          You have reviewed all completed appointments available for feedback.
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>You have not left any feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback) => {
            const artisan = artisans.find((item) => item.id === feedback.artisan_id);
            const appointment = completedAppointments.find((item) => item.id === feedback.appointment_id);

            return (
              <div key={feedback.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground">{artisan?.full_name || "Artisan"}</p>
                    {appointment && <p className="text-sm text-muted-foreground">{appointment.title}</p>}
                  </div>
                  <Badge variant="outline">{formatDateLabel(feedback.created_at.slice(0, 10))}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={`h-4 w-4 ${index < feedback.rating ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                </div>
                {feedback.comment && <p className="mt-3 text-sm text-card-foreground">{feedback.comment}</p>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
