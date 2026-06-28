import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileImageUploader } from "@/components/ProfileImageUploader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout>
        <CustSettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustSettingsContent() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    avatar_url: profile?.avatar_url || null,
    notify_email: profile?.notify_email ?? true,
    notify_sms: profile?.notify_sms ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    refreshProfile();
  };

  return (
    <>
      <PageHeader title="Settings" description="Update your profile and notification preferences" />
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-card-foreground">Profile</h2>
          <div className="mt-4 space-y-4">
            <ProfileImageUploader
              value={form.avatar_url}
              name={form.full_name}
              onChange={(value) => setForm({ ...form, avatar_url: value })}
            />
            <div>
              <Label>Full Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
                }
                placeholder="0559876543"
                inputMode="numeric"
                pattern="[0-9]*"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-card-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Appointment confirmations, changes, and cancellations can be sent to your saved email
            and phone.
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label>Email alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send booking updates to your account email.
                </p>
              </div>
              <Switch
                checked={form.notify_email}
                onCheckedChange={(value) => setForm({ ...form, notify_email: value })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label>SMS alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send short booking updates to your phone number.
                </p>
              </div>
              <Switch
                checked={form.notify_sms}
                onCheckedChange={(value) => setForm({ ...form, notify_sms: value })}
              />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
