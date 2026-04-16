import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { AppRole } from "@/types/database";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("customer");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, fullName, selectedRole);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now sign in.");
      const redirectMap = { artisan: "/artisan/dashboard", customer: "/customer/dashboard", admin: "/admin/dashboard" } as const;
      navigate({ to: redirectMap[selectedRole] as any });
    }
  };

  const roles: { value: AppRole; label: string; desc: string }[] = [
    { value: "customer", label: "Customer", desc: "Book services and leave feedback" },
    { value: "artisan", label: "Artisan", desc: "Manage your business and clients" },
    { value: "admin", label: "Admin", desc: "Oversee the entire platform" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">A</div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join ArtisanCRM today</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kofi Mensah" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="mt-1" />
          </div>
          <div>
            <Label>I am a...</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setSelectedRole(r.value)}
                  className={`rounded-lg border p-3 text-center text-sm transition-colors ${
                    selectedRole === r.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium">{r.label}</p>
                  <p className="mt-0.5 text-xs opacity-70">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
