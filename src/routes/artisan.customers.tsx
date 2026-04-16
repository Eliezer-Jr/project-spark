import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const loadCustomers = async () => {
    if (!user) return;
    const { data } = await supabase.from("customers").select("*").eq("artisan_id", user.id).order("created_at", { ascending: false });
    setCustomers((data || []) as any[]);
  };

  useEffect(() => { loadCustomers(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    if (editing) {
      const { error } = await supabase.from("customers").update(form).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert({ ...form, artisan_id: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Customer added");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", email: "", phone: "", address: "", notes: "" });
    loadCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    await supabase.from("customers").delete().eq("id", id);
    toast.success("Customer deleted");
    loadCustomers();
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setDialogOpen(true);
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} total customers`}
        action={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: "", email: "", phone: "", address: "", notes: "" }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
                <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Customer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <p>No customers found. Add your first customer to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-card-foreground">{c.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {c.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.phone}</div>}
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>}
                {c.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{c.address}</div>}
              </div>
              {c.notes && <p className="mt-3 text-xs text-muted-foreground italic">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
