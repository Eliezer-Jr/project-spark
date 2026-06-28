import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { requestOtp, signIn, role } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otpcode, setOtpcode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const redirectMap = {
    artisan: "/artisan/dashboard",
    customer: "/customer/dashboard",
    admin: "/admin/dashboard",
  } as const;

  useEffect(() => {
    if (role) {
      navigate({ to: redirectMap[role] as any });
    }
  }, [navigate, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = otpSent
      ? await signIn(phone, otpcode)
      : await requestOtp(phone, "login");
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else if (!otpSent) {
      setOtpSent(true);
      toast.success("OTP sent to your phone.");
    } else {
      toast.success("Welcome back!");
    }
  };

  if (role) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">A</div>
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your phone number</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="0559876543"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="mt-1"
              disabled={otpSent || loading}
            />
          </div>
          {otpSent && (
            <div>
              <Label htmlFor="otp">OTP Code</Label>
              <InputOTP
                id="otp"
                maxLength={5}
                value={otpcode}
                onChange={(value) => setOtpcode(value.replace(/\D/g, ""))}
                inputMode="numeric"
                pattern="[0-9]*"
                className="mt-2"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : otpSent ? "Verify and Sign In" : "Send OTP"}
          </Button>
          {otpSent && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOtpSent(false);
                setOtpcode("");
              }}
              disabled={loading}
            >
              Use a different number
            </Button>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
