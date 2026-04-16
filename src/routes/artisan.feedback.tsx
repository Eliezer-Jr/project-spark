import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/artisan/feedback")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><FeedbackContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function FeedbackContent() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("feedback").select("*").eq("artisan_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setFeedbacks((data || []) as any[]));
  }, [user]);

  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : "—";

  return (
    <>
      <PageHeader title="Feedback" description={`${feedbacks.length} reviews · Average: ${avgRating} ★`} />
      {feedbacks.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No feedback yet</p>
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
