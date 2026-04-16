import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/customer/browse")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><BrowseContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function BrowseContent() {
  const [artisans, setArtisans] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [rolesRes, catRes] = await Promise.all([
        db.from("user_roles").select("user_id").eq("role", "artisan"),
        db.from("service_categories").select("*"),
      ]);
      const artisanIds = ((rolesRes.data || []) as any[]).map((r: any) => r.user_id);
      if (artisanIds.length > 0) {
        const { data } = await db.from("profiles").select("*").in("id", artisanIds).eq("is_active", true);
        setArtisans((data || []) as any[]);
      }
      setCategories((catRes.data || []) as any[]);
    };
    load();
  }, []);

  const filtered = artisans.filter((a) => {
    const matchSearch = a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.specialization?.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || a.specialization?.toLowerCase().includes(catFilter.toLowerCase());
    return matchSearch && matchCat;
  });

  return (
    <>
      <PageHeader title="Browse Artisans" description="Find skilled service providers" />
      <div className="flex flex-col gap-3 sm:flex-row mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, skill, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Wrench className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No artisans found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {a.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{a.full_name}</h3>
                  {a.specialization && <p className="text-xs text-muted-foreground">{a.specialization}</p>}
                </div>
              </div>
              {a.location && <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2"><MapPin className="h-3.5 w-3.5" />{a.location}</div>}
              {a.bio && <p className="text-sm text-muted-foreground line-clamp-2">{a.bio}</p>}
              <Link to="/customer/appointments" className="mt-3 block">
                <Button variant="outline" size="sm" className="w-full">Book Appointment</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
