import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatCurrency, formatDateLabel, formatTimeLabel, getStatusClasses } from "@/lib/crm-helpers";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Eye, CalendarDays, ReceiptText, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/customers")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><CustomersContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomersContent() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const loadCustomers = async () => {
    if (!user) return;

    const [customerRes, appointmentRes, serviceRes] = await Promise.all([
      db.from("customers").select("*").eq("artisan_id", user.id).order("created_at", { ascending: false }),
      db.from("appointments").select("*").eq("artisan_id", user.id),
      db.from("service_records").select("*").eq("artisan_id", user.id),
    ]);

    setCustomers((customerRes.data || []) as any[]);
    setAppointments((appointmentRes.data || []) as any[]);
    setServiceRecords((serviceRes.data || []) as any[]);
  };

  useEffect(() => {
    void loadCustomers();
  }, [user]);

  const customerInsights = useMemo(
    () =>
      customers.reduce<Record<string, { appointments: number; services: number; revenue: number; lastService: string | null }>>((acc, customer) => {
        const customerAppointments = appointments.filter((appointment) => appointment.customer_id === customer.id);
        const customerServices = serviceRecords.filter((record) => record.customer_id === customer.id);

        acc[customer.id] = {
          appointments: customerAppointments.length,
          services: customerServices.length,
          revenue: customerServices.reduce((sum, record) => sum + Number(record.cost || 0), 0),
          lastService: customerServices.sort((left, right) => right.service_date.localeCompare(left.service_date))[0]?.service_date ?? null,
        };

        return acc;
      }, {}),
    [appointments, customers, serviceRecords],
  );

  const filtered = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    (customer.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (customer.phone || "").includes(search),
  );

  const selectedAppointments = selectedCustomer
    ? appointments
        .filter((appointment) => appointment.customer_id === selectedCustomer.id)
        .sort((left, right) => `${right.scheduled_date} ${right.scheduled_time}`.localeCompare(`${left.scheduled_date} ${left.scheduled_time}`))
    : [];

  const selectedServices = selectedCustomer
    ? serviceRecords
        .filter((record) => record.customer_id === selectedCustomer.id)
        .sort((left, right) => right.service_date.localeCompare(left.service_date))
    : [];

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", email: "", phone: "", address: "", notes: "" });
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;

    if (editing) {
      const { error } = await db.from("customers").update(form).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Customer updated");
    } else {
      const { error } = await db.from("customers").insert({ ...form, artisan_id: user.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Customer added");
    }

    setDialogOpen(false);
    resetForm();
    await loadCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    await db.from("customers").delete().eq("id", id);
    toast.success("Customer deleted");
    await loadCustomers();
  };

  const openEdit = (customer: any) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} total customers in your pipeline`}
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1" /></div>
                <div><Label>Address</Label><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1" /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 min-h-24" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Customer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customers by name, email, or phone..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <p>No customers found. Add your first customer to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer) => {
            const insights = customerInsights[customer.id] ?? { appointments: 0, services: 0, revenue: 0, lastService: null };

            return (
              <div key={customer.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-card-foreground">{customer.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelectedCustomer(customer); setDetailOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(customer)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(customer.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {customer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{customer.phone}</div>}
                  {customer.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{customer.email}</div>}
                  {customer.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{customer.address}</div>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Appointments</p>
                    <p className="mt-1 font-semibold text-card-foreground">{insights.appointments}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Services</p>
                    <p className="mt-1 font-semibold text-card-foreground">{insights.services}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="mt-1 font-semibold text-card-foreground">{formatCurrency(insights.revenue)}</p>
                  </div>
                </div>

                {insights.lastService && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Last service on {formatDateLabel(insights.lastService)}
                  </p>
                )}

                {customer.notes && <p className="mt-3 text-xs text-muted-foreground italic">{customer.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selectedCustomer?.name || "Customer"} Overview</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6 mt-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> Appointments</div>
                  <p className="mt-2 text-2xl font-semibold text-card-foreground">{customerInsights[selectedCustomer.id]?.appointments ?? 0}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><ReceiptText className="h-4 w-4" /> Services</div>
                  <p className="mt-2 text-2xl font-semibold text-card-foreground">{customerInsights[selectedCustomer.id]?.services ?? 0}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Lifetime Value</div>
                  <p className="mt-2 text-2xl font-semibold text-card-foreground">{formatCurrency(customerInsights[selectedCustomer.id]?.revenue ?? 0)}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-base font-semibold text-card-foreground">Appointment Timeline</h3>
                  <div className="mt-3 space-y-3">
                    {selectedAppointments.length ? (
                      selectedAppointments.map((appointment) => (
                        <div key={appointment.id} className="rounded-xl border p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-card-foreground">{appointment.title}</p>
                              <p className="text-sm text-muted-foreground">{formatDateLabel(appointment.scheduled_date)} at {formatTimeLabel(appointment.scheduled_time)}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No appointments recorded yet.</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-card-foreground">Service History</h3>
                  <div className="mt-3 space-y-3">
                    {selectedServices.length ? (
                      selectedServices.map((record) => (
                        <div key={record.id} className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-card-foreground">{record.description}</p>
                              <p className="text-sm text-muted-foreground">{formatDateLabel(record.service_date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-card-foreground">{formatCurrency(record.cost)}</p>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(record.status)}`}>
                                {record.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No service records logged yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
