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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/services")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><ServicesContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function ServicesContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", category_id: "", description: "", cost: "", status: "completed", service_date: new Date().toISOString().split("T")[0] });

  const load = async () => {
    if (!user) return;
    const [recRes, custRes, catRes] = await Promise.all([
      db.from("service_records").select("*").eq("artisan_id", user.id).order("service_date", { ascending: false }),
      db.from("customers").select("id, name").eq("artisan_id", user.id),
      db.from("service_categories").select("*"),
    ]);
    setRecords((recRes.data || []) as any[]);
    setCustomers((custRes.data || []) as any[]);
    setCategories((catRes.data || []) as any[]);
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.customer_id || !form.description) return;
    const { error } = await db.from("service_records").insert({
      artisan_id: user.id,
      customer_id: form.customer_id,
      category_id: form.category_id || null,
      description: form.description,
      cost: form.cost ? parseFloat(form.cost) : null,
      status: form.status,
      service_date: form.service_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Service record added");
    setDialogOpen(false);
    setForm({ customer_id: "", category_id: "", description: "", cost: "", status: "completed", service_date: new Date().toISOString().split("T")[0] });
    load();
  };

  return (
    <>
      <PageHeader
        title="Service Records"
        description={`${records.length} services logged`}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Log Service</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Service</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Customer *</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost (GHS)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" /></div>
                  <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} className="mt-1" /></div>
                </div>
                <Button onClick={handleSave} className="w-full">Save Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {records.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Wrench className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No service records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-card-foreground">{r.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.service_date}</p>
                </div>
                <div className="text-right">
                  {r.cost && <p className="font-semibold text-card-foreground">GHS {r.cost}</p>}
                  <span className={`inline-block mt-1 rounded-full px-3 py-0.5 text-xs font-medium ${r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
