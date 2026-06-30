import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldCheck, UserCheck, Users, UserX, Wrench } from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/app-db";
import { cn } from "@/lib/utils";
import type { AppRole, Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AdminUser = Profile & { role: AppRole };
type RoleFilter = "all" | AppRole;

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <UsersContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function UsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: roles } = await db.from("user_roles").select("user_id, role");
    const roleMap = ((roles || []) as Array<{ user_id: string; role: AppRole }>).reduce<
      Record<string, AppRole>
    >((map, item) => ({ ...map, [item.user_id]: item.role }), {});
    const ids = Object.keys(roleMap);
    if (!ids.length) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await db.from("profiles").select("*").in("id", ids);
    setUsers(
      ((profiles || []) as Profile[]).map((profile) => ({ ...profile, role: roleMap[profile.id] })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (user: AdminUser) => {
    setUpdatingId(user.id);
    const { error } = await db
      .from("profiles")
      .update({ is_active: !user.is_active })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else
      toast.success(
        user.is_active ? `${user.full_name} was deactivated` : `${user.full_name} was activated`,
      );
    await load();
    setUpdatingId(null);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = filter === "all" || user.role === filter;
      const matchesSearch =
        !query ||
        [user.full_name, user.business_name, user.location, user.phone, user.role].some((value) =>
          value?.toLowerCase().includes(query),
        );
      return matchesRole && matchesSearch;
    });
  }, [users, search, filter]);

  const counts = {
    active: users.filter((user) => user.is_active).length,
    artisans: users.filter((user) => user.role === "artisan").length,
    customers: users.filter((user) => user.role === "customer").length,
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="User Management"
        description="Manage access and review every account on the platform"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserStat label="Total accounts" value={users.length} icon={Users} tone="blue" />
        <UserStat label="Active accounts" value={counts.active} icon={UserCheck} tone="green" />
        <UserStat label="Artisans" value={counts.artisans} icon={Wrench} tone="violet" />
        <UserStat label="Customers" value={counts.customers} icon={ShieldCheck} tone="amber" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, location, phone or role…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {(["all", "artisan", "customer", "admin"] as RoleFilter[]).map((role) => (
              <Button
                key={role}
                size="sm"
                variant={filter === role ? "secondary" : "ghost"}
                className="h-7 capitalize"
                onClick={() => setFilter(role)}
              >
                {role}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/35">
                <tr>
                  {["User", "Role", "Location", "Joined", "Status", "Action"].map((heading) => (
                    <th
                      key={heading}
                      className={cn(
                        "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
                        heading === "Action" && "text-right",
                      )}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/25">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials(user.full_name)}
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-card-foreground">
                            {user.full_name || "Unnamed user"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.business_name || user.phone || "No contact details"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {user.city || user.location || "Not provided"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          user.is_active
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive",
                        )}
                      >
                        {user.is_active ? (
                          <UserCheck className="h-3.5 w-3.5" />
                        ) : (
                          <UserX className="h-3.5 w-3.5" />
                        )}
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === user.id}
                        onClick={() => void toggleActive(user)}
                      >
                        {updatingId === user.id
                          ? "Updating…"
                          : user.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No users match your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-emerald-500/10 text-emerald-600",
    violet: "bg-violet-500/10 text-violet-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <span className={cn("rounded-xl p-3", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        role === "admin" && "border-primary/20 bg-primary/10 text-primary",
        role === "artisan" &&
          "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400",
      )}
    >
      {role}
    </Badge>
  );
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"
  );
}
