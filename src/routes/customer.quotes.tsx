import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatCurrency, formatDateLabel, formatStatusLabel, getStatusClasses } from "@/lib/crm-helpers";
import { startQuotePayment, type QuotePaymentResult } from "@/lib/payments";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle2, PencilLine, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/quotes")({
  component: () => (
    <ProtectedRoute allowedRoles={["customer"]}>
      <DashboardLayout><CustomerQuotesContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function CustomerQuotesContent() {
  const { user, profile } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [changeRequest, setChangeRequest] = useState("");
  const [paymentPhone, setPaymentPhone] = useState(profile?.phone || "");
  const [paymentOption, setPaymentOption] = useState("MTN");
  const [paymentResult, setPaymentResult] = useState<QuotePaymentResult | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const load = async () => {
    if (!user) return;

    const [quoteRes, paymentRes] = await Promise.all([
      db.from("quotes").select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false }),
      db.from("payments").select("*").eq("customer_user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setQuotes((quoteRes.data || []) as any[]);
    setPayments((paymentRes.data || []) as any[]);
  };

  useEffect(() => {
    void load();
    const subscriptions = [
      db.onTableChange("quotes", () => void load()),
      db.onTableChange("payments", () => void load()),
    ];
    return () => subscriptions.forEach((subscription) => subscription.unsubscribe());
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

  const startPayment = async () => {
    if (!user || !selectedQuote || !paymentPhone.trim()) return;

    const amount = Number(selectedQuote.deposit_amount || selectedQuote.amount || 0);
    if (amount <= 0) {
      toast.error("Quote amount is required before payment.");
      return;
    }

    setIsPaying(true);
    try {
      const result = await startQuotePayment({
        quoteId: selectedQuote.id,
        artisanId: selectedQuote.artisan_id,
        customerUserId: user.id,
        amount,
        phone: paymentPhone.trim(),
        paymentOption,
        note: selectedQuote.deposit_amount ? "Quote deposit" : "Quote payment",
      });

      setPaymentResult(result);
      toast.success(result.checkoutUrl ? "Checkout opened" : "Payment request sent to phone");
      await load();

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start payment.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <>
      <PageHeader title="My Quotes" description="Approve estimates, request changes, or pay approved quotes" />

      {quotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No quotes have been sent to you yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            const quotePayments = payments.filter((payment) => payment.quote_id === quote.id);

            return (
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
                      {quote.deposit_amount ? ` - Deposit: ${formatCurrency(quote.deposit_amount)}` : ""}
                      {quote.valid_until ? ` - Valid until ${formatDateLabel(quote.valid_until)}` : ""}
                    </p>
                    {quotePayments.length > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Payment:{" "}
                        {quotePayments
                          .map((payment) => `${formatCurrency(payment.amount)} ${formatStatusLabel(payment.status)}`)
                          .join(", ")}
                      </p>
                    )}
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

                  {quote.status === "approved" && (
                    <Dialog
                      open={paymentDialogOpen && selectedQuote?.id === quote.id}
                      onOpenChange={(open) => {
                        setPaymentDialogOpen(open);
                        if (open) {
                          setSelectedQuote(quote);
                          setPaymentPhone(profile?.phone || "");
                          setPaymentOption("MTN");
                          setPaymentResult(null);
                        } else {
                          setSelectedQuote(null);
                          setPaymentResult(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedQuote(quote)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay {quote.deposit_amount ? "Deposit" : "Now"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Pay Quote</DialogTitle></DialogHeader>
                        {paymentResult ? (
                          <div className="mt-2 space-y-4">
                            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                              <div className="flex items-center gap-2 font-medium text-card-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                Payment request created
                              </div>
                              <p className="mt-2 text-muted-foreground">
                                {paymentResult.checkoutUrl
                                  ? "A checkout window was opened. Complete the payment there."
                                  : `Approve the mobile money prompt sent to ${paymentPhone}.`}
                              </p>
                              {paymentResult.providerReference ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Reference: {paymentResult.providerReference}
                                </p>
                              ) : null}
                            </div>
                            {paymentResult.checkoutUrl ? (
                              <Button
                                variant="outline"
                                onClick={() => window.open(paymentResult.checkoutUrl!, "_blank", "noopener,noreferrer")}
                                className="w-full"
                              >
                                Reopen Checkout
                              </Button>
                            ) : null}
                            <Button onClick={() => setPaymentDialogOpen(false)} className="w-full">Done</Button>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-3">
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            <p className="font-medium text-card-foreground">{quote.title}</p>
                            <p className="mt-1 text-muted-foreground">
                              Amount due: {formatCurrency(quote.deposit_amount || quote.amount)}
                            </p>
                          </div>
                          <div>
                            <Label>Mobile money number</Label>
                            <Input
                              value={paymentPhone}
                              onChange={(event) =>
                                setPaymentPhone(event.target.value.replace(/\D/g, ""))
                              }
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="mt-1"
                              placeholder="+233..."
                          />
                        </div>
                        <div>
                          <Label>Mobile money network</Label>
                          <Select value={paymentOption} onValueChange={setPaymentOption}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MTN">MTN</SelectItem>
                              <SelectItem value="VODAFONE">Vodafone</SelectItem>
                              <SelectItem value="AIRTELTIGO">AirtelTigo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                          <Button onClick={startPayment} disabled={isPaying || !paymentPhone.trim()} className="w-full">
                            {isPaying ? "Starting Payment..." : "Pay with Redde"}
                          </Button>
                        </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
