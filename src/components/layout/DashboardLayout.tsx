import { AppSidebar } from "./AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-64">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
