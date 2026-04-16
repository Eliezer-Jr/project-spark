import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/appointments")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustAppointmentsContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustAppointmentsContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [artisans, setArtisans] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ artisan_id: "", title: "", description: "", scheduled_date: "", scheduled_time: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await db.from("appointments").select("*").eq("customer_user_id", user.id).order("scheduled_date", { ascending: false });
    setAppointments((data || []) as any[]);
    // Load artisans
    const rolesRes = await db.from("user_roles").select("user_id").eq("role", "artisan");
    const ids = ((rolesRes.data || []) as any[]).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, full_name, specialization").in("id", ids);
      setArtisans((profiles || []) as any[]);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleBook = async () => {
    if (!user || !form.artisan_id || !form.title || !form.scheduled_date || !form.scheduled_time) return;
    const { error } = await db.from("appointments").insert({
      artisan_id: form.artisan_id,
      customer_user_id: user.id,
      title: form.title,
      description: form.description || null,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment booked!");
    setDialogOpen(false);
    setForm({ artisan_id: "", title: "", description: "", scheduled_date: "", scheduled_time: "" });
    load();
  };

  return (
    <>
      <PageHeader
        title="My Appointments"
        description="Your service bookings"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Book Appointment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Artisan *</Label>
                  <Select value={form.artisan_id} onValueChange={(v) => setForm({ ...form, artisan_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select artisan" /></SelectTrigger>
                    <SelectContent>{artisans.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name} — {a.specialization || "General"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Service Needed *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fix leaking pipe" className="mt-1" /></div>
                <div><Label>Details</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date *</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="mt-1" /></div>
                  <div><Label>Time *</Label><Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} className="mt-1" /></div>
                </div>
                <Button onClick={handleBook} className="w-full">Book Now</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {appointments.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Calendar className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No appointments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-card-foreground">{appt.title}</h3>
                <p className="text-sm text-muted-foreground">{appt.scheduled_date} at {appt.scheduled_time}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                appt.status === "confirmed" ? "bg-success/10 text-success" :
                appt.status === "pending" ? "bg-warning/10 text-warning" :
                appt.status === "completed" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>{appt.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
