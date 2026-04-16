import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/feedback")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustFeedbackContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustFeedbackContent() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [artisans, setArtisans] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ artisan_id: "", rating: "5", comment: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await db.from("feedback").select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false });
    setFeedbacks((data || []) as any[]);
    const rolesRes = await db.from("user_roles").select("user_id").eq("role", "artisan");
    const ids = ((rolesRes.data || []) as any[]).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", ids);
      setArtisans((profiles || []) as any[]);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleSubmit = async () => {
    if (!user || !form.artisan_id) return;
    const { error } = await db.from("feedback").insert({
      artisan_id: form.artisan_id,
      customer_user_id: user.id,
      rating: parseInt(form.rating),
      comment: form.comment || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Feedback submitted!");
    setDialogOpen(false);
    setForm({ artisan_id: "", rating: "5", comment: "" });
    load();
  };

  return (
    <>
      <PageHeader
        title="My Feedback"
        description="Reviews you've given"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Leave Feedback</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Leave Feedback</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div><Label>Artisan *</Label>
                  <Select value={form.artisan_id} onValueChange={(v) => setForm({ ...form, artisan_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select artisan" /></SelectTrigger>
                    <SelectContent>{artisans.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Rating</Label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setForm({ ...form, rating: String(n) })}>
                        <Star className={`h-6 w-6 ${n <= parseInt(form.rating) ? "fill-warning text-warning" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label>Comment</Label><Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Share your experience..." className="mt-1" /></div>
                <Button onClick={handleSubmit} className="w-full">Submit Feedback</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {feedbacks.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>You haven't left any feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((f) => (
            <div key={f.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < f.rating ? "fill-warning text-warning" : "text-muted"}`} />
                ))}
              </div>
              {f.comment && <p className="text-sm text-card-foreground">{f.comment}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
