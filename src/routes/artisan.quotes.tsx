import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/app-db";
import { formatCurrency, formatDateLabel, formatStatusLabel, getStatusClasses } from "@/lib/crm-helpers";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, ArrowRightCircle, Archive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/artisan/quotes")({
  component: () => (
    <ProtectedRoute allowedRoles={["artisan"]}>
      <DashboardLayout><ArtisanQuotesContent /></DashboardLayout>
    </ProtectedRoute>
  ),
});

function ArtisanQuotesContent() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    title: "",
    description: "",
    amount: "",
    deposit_amount: "",
    valid_until: "",
    status: "draft",
  });

  const load = async () => {
    if (!user) return;

    const [quoteRes, customerRes] = await Promise.all([
      db.from("quotes").select("*").eq("artisan_id", user.id).order("created_at", { ascending: false }),
      db.from("customers").select("*").eq("artisan_id", user.id).order("name", { ascending: true }),
    ]);

    setQuotes((quoteRes.data || []) as any[]);
    setCustomers((customerRes.data || []) as any[]);
  };

  useEffect(() => {
    void load();
  }, [user]);

  const stats = useMemo(() => ({
    draft: quotes.filter((quote) => quote.status === "draft").length,
    awaiting: quotes.filter((quote) => quote.status === "awaiting_response").length,
    changes: quotes.filter((quote) => quote.status === "changes_requested").length,
    approved: quotes.filter((quote) => quote.status === "approved").length,
  }), [quotes]);

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.amount || !form.customer_id) return;

    const customer = customers.find((item) => item.id === form.customer_id);

    const { error } = await db.from("quotes").insert({
      artisan_id: user.id,
      customer_id: form.customer_id,
      customer_user_id: customer?.email === "customer@artisancrm.local" ? "user-customer" : null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount: Number(form.amount),
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null,
      status: form.status as any,
      requested_changes: null,
      valid_until: form.valid_until || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Quote created");
    setDialogOpen(false);
    setForm({ customer_id: "", title: "", description: "", amount: "", deposit_amount: "", valid_until: "", status: "draft" });
    await load();
  };

  const updateQuote = async (quoteId: string, patch: Record<string, unknown>, successMessage: string) => {
    const { error } = await db.from("quotes").update(patch).eq("id", quoteId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(successMessage);
    await load();
  };

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Create estimates, send them for approval, and track change requests"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> New Quote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Quote</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div>
                  <Label>Customer *</Label>
                  <Select value={form.customer_id} onValueChange={(value) => setForm({ ...form, customer_id: value })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Title *</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 min-h-24" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-1" /></div>
                  <div><Label>Deposit</Label><Input type="number" value={form.deposit_amount} onChange={(event) => setForm({ ...form, deposit_amount: event.target.value })} className="mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={(event) => setForm({ ...form, valid_until: event.target.value })} className="mt-1" /></div>
                  <div>
                    <Label>Initial Status</Label>
                    <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="awaiting_response">Send for Approval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Save Quote</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Draft", value: stats.draft },
          { label: "Awaiting", value: stats.awaiting },
          { label: "Changes Requested", value: stats.changes },
          { label: "Approved", value: stats.approved },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-card-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>No quotes yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            const customer = customers.find((item) => item.id === quote.customer_id);

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
                      {customer?.name || "Customer"} · {formatCurrency(quote.amount)}
                      {quote.valid_until ? ` · Valid until ${formatDateLabel(quote.valid_until)}` : ""}
                    </p>
                    {quote.description && <p className="mt-3 text-sm text-card-foreground">{quote.description}</p>}
                    {quote.deposit_amount ? <p className="mt-2 text-sm text-muted-foreground">Deposit requested: {formatCurrency(quote.deposit_amount)}</p> : null}
                    {quote.requested_changes ? (
                      <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
                        Customer requested changes: {quote.requested_changes}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {quote.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => updateQuote(quote.id, { status: "awaiting_response" }, "Quote sent for approval")}>
                        <ArrowRightCircle className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                    )}
                    {quote.status === "changes_requested" && (
                      <Button variant="outline" size="sm" onClick={() => updateQuote(quote.id, { status: "awaiting_response", requested_changes: null }, "Quote resent to customer")}>
                        <ArrowRightCircle className="mr-2 h-4 w-4" />
                        Resend
                      </Button>
                    )}
                    {quote.status === "approved" && (
                      <Button size="sm" onClick={() => updateQuote(quote.id, { status: "converted" }, "Quote converted to work")}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Convert
                      </Button>
                    )}
                    {quote.status !== "archived" && (
                      <Button variant="ghost" size="sm" onClick={() => updateQuote(quote.id, { status: "archived" }, "Quote archived")}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
