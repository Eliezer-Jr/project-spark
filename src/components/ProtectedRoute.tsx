import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";
import type { AppRole } from "@/types/database";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const redirectMap: Record<AppRole, string> = {
      artisan: "/artisan/dashboard",
      customer: "/customer/dashboard",
      admin: "/admin/dashboard",
    };
    return <Navigate to={redirectMap[role] as any} />;
  }

  return <>{children}</>;
}
