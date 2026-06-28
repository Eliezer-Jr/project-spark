import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
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
import { CheckCircle2, MessageSquare, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { Database } from "@/types/database";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const feedbackSearchSchema = z.object({
  appointmentId: z.string().optional(),
});

export const Route = createFileRoute("/customer/feedback")({
  validateSearch: feedbackSearchSchema,
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <CustFeedbackContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustFeedbackContent() {
  const search = Route.useSearch();
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [artisans, setArtisans] = useState<Profile[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [form, setForm] = useState({ appointment_id: "", rating: "5", comment: "" });

  const load = async () => {
    if (!user) return;

    const [feedbackRes, appointmentRes, availableArtisans] = await Promise.all([
      db
        .from("feedback")
        .select("*")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false }),
      db
        .from("appointments")
        .select("*")
        .eq("customer_user_id", user.id)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false }),
      db.getAvailableArtisans(),
    ]);

    setFeedbacks((feedbackRes.data || []) as Feedback[]);
    setCompletedAppointments((appointmentRes.data || []) as Appointment[]);
    setArtisans(availableArtisans);
  };

  useEffect(() => {
    void load();
    const subscriptions = [
      db.onTableChange("feedback", () => void load()),
      db.onTableChange("appointments", () => void load()),
    ];
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
  }, [user]);

  const eligibleAppointments = useMemo(
    () =>
      completedAppointments.filter(
        (appointment) => !feedbacks.some((feedback) => feedback.appointment_id === appointment.id),
      ),
    [completedAppointments, feedbacks],
  );

  const selectableAppointments = editingFeedbackId ? completedAppointments : eligibleAppointments;
  const selectedAppointment =
    selectableAppointments.find((appointment) => appointment.id === form.appointment_id) ?? null;
  const selectedArtisan =
    artisans.find((artisan) => artisan.id === selectedAppointment?.artisan_id) ?? null;

  useEffect(() => {
    if (!search.appointmentId) return;
    if (!eligibleAppointments.some((appointment) => appointment.id === search.appointmentId))
      return;
    setForm((current) => ({ ...current, appointment_id: search.appointmentId || "" }));
    setEditingFeedbackId(null);
    setDialogOpen(true);
  }, [eligibleAppointments, search.appointmentId]);

  const handleSubmit = async () => {
    if (!user || !selectedAppointment) return;

    const payload = {
      rating: parseInt(form.rating, 10),
      comment: form.comment.trim() || null,
    };
    const { error } = editingFeedbackId
      ? await db.from("feedback").update(payload).eq("id", editingFeedbackId)
      : await db.from("feedback").insert({
          artisan_id: selectedAppointment.artisan_id,
          customer_user_id: user.id,
          appointment_id: selectedAppointment.id,
          ...payload,
        });
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingFeedbackId ? "Feedback updated" : "Feedback submitted!");
    setDialogOpen(false);
    setForm({ appointment_id: "", rating: "5", comment: "" });
    setEditingFeedbackId(null);
    await load();
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await db.from("feedback").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Feedback removed");
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
                setEditingFeedbackId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={!eligibleAppointments.length}>
                <Plus className="mr-2 h-4 w-4" /> Leave Feedback
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFeedbackId ? "Edit Feedback" : "Leave Feedback"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Completed Appointment *</Label>
                  <Select
                    disabled={Boolean(editingFeedbackId)}
                    value={form.appointment_id}
                    onValueChange={(value) => setForm({ ...form, appointment_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select completed appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableAppointments.map((appointment) => {
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
                          {selectedArtisan?.specialization
                            ? ` - ${selectedArtisan.specialization}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {formatDateLabel(selectedAppointment.scheduled_date)}
                      </Badge>
                    </div>
                    {selectedAppointment.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedAppointment.description}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, rating: String(value) })}
                      >
                        <Star
                          className={`h-6 w-6 ${value <= parseInt(form.rating, 10) ? "fill-warning text-warning" : "text-muted"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Comment</Label>
                  <Textarea
                    value={form.comment}
                    onChange={(event) => setForm({ ...form, comment: event.target.value })}
                    placeholder="Share your experience..."
                    className="mt-1 min-h-24"
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={!selectedAppointment}>
                  {editingFeedbackId ? "Save Changes" : "Submit Feedback"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <ServiceLifecycleStrip active="feedback" />

      {completedAppointments.length > 0 && !eligibleAppointments.length && (
        <div className="mb-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          You have reviewed all completed appointments available for feedback.
        </div>
      )}

      {feedbacks.length === 0 ? (
        <CustomerEmptyState
          icon={MessageSquare}
          title="You have not left any feedback yet"
          description={
            eligibleAppointments.length
              ? "Review a completed service to help other customers choose confidently."
              : "Once a service is completed, you can rate the artisan here."
          }
          action={
            eligibleAppointments.length ? (
              <Button onClick={() => setDialogOpen(true)}>Review a service</Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/customer/history">View service history</Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {feedbacks.map((feedback) => {
            const artisan = artisans.find((item) => item.id === feedback.artisan_id);
            const appointment = completedAppointments.find(
              (item) => item.id === feedback.appointment_id,
            );

            return (
              <div key={feedback.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      {artisan?.full_name || "Artisan"}
                    </p>
                    {appointment && (
                      <p className="text-sm text-muted-foreground">{appointment.title}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {formatDateLabel(feedback.created_at.slice(0, 10))}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${index < feedback.rating ? "fill-warning text-warning" : "text-muted"}`}
                    />
                  ))}
                </div>
                {feedback.comment && (
                  <p className="mt-3 text-sm text-card-foreground">{feedback.comment}</p>
                )}
                <div className="mt-4 flex gap-2 border-t pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingFeedbackId(feedback.id);
                      setForm({
                        appointment_id: feedback.appointment_id || "",
                        rating: String(feedback.rating),
                        comment: feedback.comment || "",
                      });
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes your rating and makes the service available to review again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep review</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteFeedback(feedback.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
