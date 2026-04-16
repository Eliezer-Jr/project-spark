import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout><UsersContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function UsersContent() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap: Record<string, string> = {};
    ((roles || []) as any[]).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const ids = Object.keys(roleMap);
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
      setUsers(((profiles || []) as any[]).map((p: any) => ({ ...p, role: roleMap[p.id] })));
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "User deactivated" : "User activated");
    load();
  };

  const filtered = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="User Management" description={`${users.length} registered users`} />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-card-foreground">{u.full_name || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "admin" ? "default" : u.role === "artisan" ? "secondary" : "outline"}>
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.location || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.is_active ? "text-success" : "text-destructive"}`}>
                    {u.is_active ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(u.id, u.is_active)}>
                    {u.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground">No users found</div>}
      </div>
    </>
  );
}
