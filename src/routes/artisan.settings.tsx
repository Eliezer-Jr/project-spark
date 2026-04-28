import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/settings")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function SettingsContent() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
    specialization: profile?.specialization || "",
    bio: profile?.bio || "",
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
      <PageHeader title="Settings" description="Update your profile, business info, and alerts" />
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-card-foreground">Business Profile</h2>
          <div className="mt-4 space-y-4">
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
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+233..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Accra, Ghana"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                placeholder="e.g. Plumbing, Electrical"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell customers about your services..."
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-card-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New booking requests and booking status changes can be sent to your saved email and
            phone.
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label>Email alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send appointment messages to your account email.
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
                  Send urgent booking updates to your phone number.
                </p>
              </div>
              <Switch
                checked={form.notify_sms}
                onCheckedChange={(value) => setForm({ ...form, notify_sms: value })}
              />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
