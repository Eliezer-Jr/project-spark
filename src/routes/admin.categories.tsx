import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, FolderCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout><CategoriesContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CategoriesContent() {
  const [categories, setCategories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const { data } = await supabase.from("service_categories").select("*").order("name");
    setCategories((data || []) as any[]);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { error } = await supabase.from("service_categories").update(form).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Category updated");
    } else {
      const { error } = await supabase.from("service_categories").insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success("Category added");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", description: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await supabase.from("service_categories").delete().eq("id", id);
    toast.success("Category deleted");
    load();
  };

  return (
    <>
      <PageHeader
        title="Service Categories"
        description="Manage artisan service types"
        action={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ name: "", description: "" }); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Category</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {categories.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FolderCog className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No categories yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="flex items-start justify-between rounded-xl border bg-card p-5 shadow-sm">
              <div>
                <h3 className="font-semibold text-card-foreground">{c.name}</h3>
                {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setForm({ name: c.name, description: c.description || "" }); setDialogOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
