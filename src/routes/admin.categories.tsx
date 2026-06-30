import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/app-db";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, FolderCog, Search, Layers3, Calendar, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["service_categories"]["Row"];

export const Route = createFileRoute("/admin/categories")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <CategoriesContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [usage, setUsage] = useState<Record<string, { appointments: number; services: number }>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const [categoryRes, appointmentRes, serviceRes] = await Promise.all([
      db.from("service_categories").select("*").order("name"),
      db.from("appointments").select("category_id"),
      db.from("service_records").select("category_id"),
    ]);
    setCategories((categoryRes.data || []) as Category[]);
    const nextUsage: Record<string, { appointments: number; services: number }> = {};
    for (const item of (appointmentRes.data || []) as Array<{ category_id: string | null }>) {
      if (!item.category_id) continue;
      nextUsage[item.category_id] ||= { appointments: 0, services: 0 };
      nextUsage[item.category_id].appointments += 1;
    }
    for (const item of (serviceRes.data || []) as Array<{ category_id: string | null }>) {
      if (!item.category_id) continue;
      nextUsage[item.category_id] ||= { appointments: 0, services: 0 };
      nextUsage[item.category_id].services += 1;
    }
    setUsage(nextUsage);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      const { error } = await db.from("service_categories").update(form).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Category updated");
    } else {
      const { error } = await db.from("service_categories").insert(form);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Category added");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: "", description: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    await db.from("service_categories").delete().eq("id", id);
    toast.success("Category deleted");
    load();
  };

  const filtered = useMemo(
    () =>
      categories.filter((category) =>
        `${category.name} ${category.description || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [categories, search],
  );
  const usedCategories = categories.filter(
    (category) => (usage[category.id]?.appointments || 0) + (usage[category.id]?.services || 0) > 0,
  ).length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Service Categories"
        description="Organize the services customers can discover and book"
        action={
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) {
                setEditing(null);
                setForm({ name: "", description: "" });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit" : "Add"} Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editing ? "Update" : "Add"} Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <CategoryStat icon={Layers3} label="Total categories" value={categories.length} />
        <CategoryStat icon={Wrench} label="Categories in use" value={usedCategories} />
        <CategoryStat
          icon={Calendar}
          label="Categorized bookings"
          value={Object.values(usage).reduce((sum, item) => sum + item.appointments, 0)}
        />
      </div>
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories…"
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FolderCog className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>{search ? "No categories match your search" : "No categories yet"}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group flex min-h-40 items-start justify-between rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderCog className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-card-foreground">{c.name}</h3>
                {c.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{usage[c.id]?.appointments || 0} bookings</Badge>
                  <Badge variant="outline">{usage[c.id]?.services || 0} services</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setEditing(c);
                    setForm({ name: c.name, description: c.description || "" });
                    setDialogOpen(true);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}
