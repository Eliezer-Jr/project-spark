import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wrench,
  MessageSquare,
  Settings,
  Search,
  ClipboardList,
  BarChart3,
  FolderCog,
  Activity,
  LogOut,
  Menu,
  X,
  FileText,
  Inbox,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const artisanLinks = [
  { to: "/artisan/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/artisan/customers", label: "Customers", icon: Users },
  { to: "/artisan/appointments", label: "Appointments", icon: Calendar },
  { to: "/artisan/services", label: "Services", icon: Wrench },
  { to: "/artisan/quotes", label: "Quotes", icon: FileText },
  { to: "/artisan/requests", label: "Requests", icon: Inbox },
  { to: "/artisan/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/artisan/settings", label: "Settings", icon: Settings },
];

const customerLinks = [
  { to: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customer/browse", label: "Browse Artisans", icon: Search },
  { to: "/customer/requests", label: "Service Requests", icon: Inbox },
  { to: "/customer/quotes", label: "My Quotes", icon: FileText },
  { to: "/customer/appointments", label: "Appointments", icon: Calendar },
  { to: "/customer/history", label: "Service History", icon: ClipboardList },
  { to: "/customer/feedback", label: "My Feedback", icon: MessageSquare },
  { to: "/customer/settings", label: "Settings", icon: Settings },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: FolderCog },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/activity", label: "Activity", icon: Activity },
];

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    role === "artisan" ? artisanLinks : role === "customer" ? customerLinks : adminLinks;
  const roleLabel =
    role === "artisan" ? "Artisan Portal" : role === "customer" ? "Customer Portal" : "Admin Panel";

  const nav = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <ProfileAvatar
          src={profile?.avatar_url}
          name={profile?.full_name}
          className="h-9 w-9 border-sidebar-border"
          fallbackClassName="bg-sidebar-primary text-sm text-sidebar-primary-foreground"
        />
        <div>
          <p className="font-semibold text-sm">{roleLabel}</p>
          <p className="text-xs text-sidebar-foreground/60">{profile?.full_name || "User"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-sidebar p-2 text-sidebar-foreground shadow-lg md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {nav}
      </aside>
    </>
  );
}
