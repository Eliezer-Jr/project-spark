import { createFileRoute } from "@tanstack/react-router";
import { Award, MessageSquare, Star, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import type { Database } from "@/types/database";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export const Route = createFileRoute("/artisan/feedback")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout>
        <FeedbackContent />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

function FeedbackContent() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const load = async () => {
    if (!user) return;
    setFeedbacks(await db.getMyFeedback());
  };

  useEffect(() => {
    void load();
    const subscription = db.onTableChange("feedback", () => void load());
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, [user]);

  const summary = useMemo(() => {
    const average = feedbacks.length
      ? feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length
      : 0;
    return {
      average,
      fiveStar: feedbacks.filter((item) => item.rating === 5).length,
      distribution: [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: feedbacks.filter((item) => item.rating === rating).length,
      })),
    };
  }, [feedbacks]);

  return (
    <>
      <PageHeader
        title="Customer Feedback"
        description="Ratings and reviews from your completed appointments"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Average rating", value: summary.average ? summary.average.toFixed(1) : "—", icon: Star },
          { label: "Total reviews", value: feedbacks.length, icon: MessageSquare },
          { label: "Five-star reviews", value: summary.fiveStar, icon: Award },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
            </div>
          );
        })}
      </div>

      {feedbacks.length > 0 && (
        <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Rating distribution
          </div>
          <div className="mt-4 space-y-2">
            {summary.distribution.map((item) => (
              <div key={item.rating} className="grid grid-cols-[44px_1fr_28px] items-center gap-3 text-sm">
                <span className="flex items-center gap-1">{item.rating}<Star className="h-3 w-3 fill-warning text-warning" /></span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${feedbacks.length ? (item.count / feedbacks.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-right text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedbacks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p className="font-medium text-foreground">No feedback yet</p>
          <p className="mt-1 text-sm">Reviews appear here after customers rate completed services.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {feedbacks.map((feedback) => (
            <article key={feedback.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < feedback.rating ? "fill-warning text-warning" : "text-muted"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(feedback.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Badge variant="secondary">Verified service</Badge>
              </div>
              <p className="mt-4 min-h-10 text-sm leading-6 text-card-foreground">
                {feedback.comment || "The customer left a rating without a written comment."}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
