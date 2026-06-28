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
import { Plus, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/appointments")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><AppointmentsContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function AppointmentsContent() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", customer_id: "", scheduled_date: "", scheduled_time: "", status: "pending" });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    try {
      const [serverAppointments, custRes] = await Promise.all([
        db.getMyAppointments(),
        db.from("customers").select("id, name").eq("artisan_id", user.id),
      ]);
      setAppointments(serverAppointments);
      setCustomers((custRes.data || []) as any[]);
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
        status: form.status as "pending" | "confirmed" | "completed" | "cancelled",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create appointment.");
      return;
    }
    toast.success("Appointment created");
    setDialogOpen(false);
    setForm({ title: "", description: "", customer_id: "", scheduled_date: "", scheduled_time: "", status: "pending" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await db.updateAppointment(id, {
        status: status as "pending" | "confirmed" | "completed" | "cancelled",
      });
      toast.success("Status updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update appointment.");
    }
  };

  const filtered = filter === "all" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Manage your schedule"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Appointment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
                <div><Label>Customer</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date *</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className="mt-1" /></div>
                  <div><Label>Time *</Label><Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} className="mt-1" /></div>
                </div>
                <Button onClick={handleSave} className="w-full">Create Appointment</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mb-4 flex gap-2">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
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
          {filtered.map((appt) => (
            <div key={appt.id} className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-card-foreground">{appt.title}</h3>
                {appt.description && <p className="text-sm text-muted-foreground">{appt.description}</p>}
                <p className="mt-1 text-sm text-muted-foreground">{appt.scheduled_date} at {appt.scheduled_time}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={appt.status} onValueChange={(v) => updateStatus(appt.id, v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
