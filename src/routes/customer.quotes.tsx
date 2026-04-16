import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatCurrency, formatDateLabel, formatStatusLabel, getStatusClasses } from "@/lib/crm-helpers";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle2, PencilLine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/quotes")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustomerQuotesContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomerQuotesContent() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [changeRequest, setChangeRequest] = useState("");

  const load = async () => {
    if (!user) return;

    const { data } = await db.from("quotes").select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false });
    setQuotes((data || []) as any[]);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const updateQuote = async (quoteId: string, patch: Record<string, unknown>, successMessage: string) => {
    const { error } = await db.from("quotes").update(patch).eq("id", quoteId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(successMessage);
    await load();
  };

  const submitChangeRequest = async () => {
    if (!selectedQuote || !changeRequest.trim()) return;

    await updateQuote(
      selectedQuote.id,
      { status: "changes_requested", requested_changes: changeRequest.trim() },
      "Change request sent",
    );

    setDialogOpen(false);
    setSelectedQuote(null);
    setChangeRequest("");
  };

  return (
    <>
      <PageHeader title="My Quotes" description="Approve estimates or request changes before work begins" />

      {quotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No quotes have been sent to you yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{quote.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(quote.status)}`}>
                      {formatStatusLabel(quote.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total: {formatCurrency(quote.amount)}
                    {quote.deposit_amount ? ` · Deposit: ${formatCurrency(quote.deposit_amount)}` : ""}
                    {quote.valid_until ? ` · Valid until ${formatDateLabel(quote.valid_until)}` : ""}
                  </p>
                  {quote.description && <p className="mt-3 text-sm text-card-foreground">{quote.description}</p>}
                  {quote.requested_changes && (
                    <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                      Requested changes: {quote.requested_changes}
                    </div>
                  )}
                </div>

                {(quote.status === "awaiting_response" || quote.status === "changes_requested") && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => updateQuote(quote.id, { status: "approved", requested_changes: null }, "Quote approved")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Dialog
                      open={dialogOpen && selectedQuote?.id === quote.id}
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedQuote(null);
                          setChangeRequest("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedQuote(quote)}>
                          <PencilLine className="mr-2 h-4 w-4" />
                          Request Changes
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Request Quote Changes</DialogTitle></DialogHeader>
                        <div className="space-y-3 mt-2">
                          <div>
                            <Label>What should change?</Label>
                            <Textarea value={changeRequest} onChange={(event) => setChangeRequest(event.target.value)} className="mt-1 min-h-24" placeholder="Describe pricing, scope, or timeline changes you want." />
                          </div>
                          <Button onClick={submitChangeRequest} className="w-full">Send Request</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
