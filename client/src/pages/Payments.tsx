import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, TrendingUp, Clock, CheckCircle2, AlertTriangle, Search, CalendarClock, Link2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDateTime, formatDate } from "../lib/utils.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function fmt(n: unknown) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? "0" : v.toLocaleString("en-IN");
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", upi: "UPI", bank_transfer: "Bank Transfer", card: "Card", cheque: "Cheque",
};
const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  failed:    "bg-red-100 text-red-700",
  refunded:  "bg-gray-100 text-gray-600",
};

export function PaymentsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [trendDays, setTrendDays] = useState("30");

  const { data: statsData } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: () => apiRequest<any>("GET", "/api/payments/stats"),
  });
  const { data: trendData } = useQuery({
    queryKey: ["payment-trend", trendDays],
    queryFn: () => apiRequest<any>("GET", `/api/payments/revenue-trend?days=${trendDays}`),
  });
  const { data: listData, isLoading } = useQuery({
    queryKey: ["payments", method, status],
    queryFn: () => apiRequest<any>("GET", `/api/payments?limit=100${method ? `&method=${method}` : ""}${status ? `&status=${status}` : ""}`),
    staleTime: 30_000,
  });

  const stats = statsData?.data;
  const trend = trendData?.data ?? [];
  const payments: any[] = listData?.data ?? [];

  const filtered = search
    ? payments.filter((p) =>
        p.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.receipt_no?.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/payments", body),
    onSuccess: () => {
      toast.success("Payment recorded");
      setShowNew(false);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payment-stats"] });
      qc.invalidateQueries({ queryKey: ["payment-trend"] });
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const { data: duesData } = useQuery({
    queryKey: ["payment-dues"],
    queryFn: () => apiRequest<any>("GET", "/api/payments/dues?days=7"),
    staleTime: 60_000,
  });
  const dues = duesData?.data ?? { overdue: [], upcoming: [] };
  const duesMeta = duesData?.meta ?? {};

  const KPIS = [
    { label: "Today's Collection", value: `₹${fmt(stats?.today)}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "This Month", value: `₹${fmt(stats?.this_month)}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "All Time", value: `₹${fmt(stats?.all_time)}`, icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Overdue Dues", value: `₹${fmt(duesMeta.overdueAmt)}`, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50",
      sub: `${duesMeta.overdueCount ?? 0} installments` },
    { label: "Due This Week", value: `₹${fmt(duesMeta.upcomingAmt)}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50",
      sub: `${duesMeta.upcomingCount ?? 0} installments` },
  ];

  return (
    <AppShell title="Payments & Revenue">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
        {KPIS.map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
                {k.sub && <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>}
              </div>
              <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${k.bg}`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue trend chart */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Revenue Trend</CardTitle>
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {["7","14","30","60","90"].map((d) => (
              <button key={d} onClick={() => setTrendDays(d)}
                className={`px-2 py-1 ${trendDays === d ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>
                {d}d
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Dues Panel */}
      {(dues.overdue.length > 0 || dues.upcoming.length > 0) && (
        <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
          {dues.overdue.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm text-red-700">Overdue Installments ({dues.overdue.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-56 overflow-y-auto">
                  {dues.overdue.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2 border-b last:border-0 hover:bg-red-50/40">
                      <div>
                        <p className="text-xs font-medium">{d.lead_name}</p>
                        <p className="text-[10px] text-gray-400">{d.lead_phone} · {d.counsellor_name ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-red-600">₹{fmt(d.amount)}</p>
                        <p className="text-[10px] text-gray-400">Inst #{d.installment_no} · Due {formatDate(d.due_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {dues.upcoming.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm text-amber-700">Due This Week ({dues.upcoming.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-56 overflow-y-auto">
                  {dues.upcoming.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2 border-b last:border-0 hover:bg-amber-50/40">
                      <div>
                        <p className="text-xs font-medium">{d.lead_name}</p>
                        <p className="text-[10px] text-gray-400">{d.lead_phone} · {d.counsellor_name ?? "—"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-amber-700">₹{fmt(d.amount)}</p>
                        <p className="text-[10px] text-gray-400">Inst #{d.installment_no} · Due {formatDate(d.due_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm">All Payments</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Search lead, receipt…" className="pl-8 h-8 text-xs w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={method || "all"} onValueChange={(v) => setMethod(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {Object.entries(METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setShowLink(true)}>
              <Link2 className="h-4 w-4" /> Send Payment Link
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50/50">
              <tr>
                {["Date", "Student", "Amount", "Method", "Receipt", "Status", "Note"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No payments found</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.paid_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{p.lead_name ?? "—"}</p>
                    <p className="text-[10px] text-gray-400">{p.lead_phone}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700">₹{fmt(p.amount)}</td>
                  <td className="px-4 py-3 text-xs">{METHOD_LABELS[p.method] ?? p.method}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.receipt_no ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{p.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* New Payment Dialog */}
      {showNew && (
        <NewPaymentDialog
          onClose={() => setShowNew(false)}
          onSave={(data) => createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}

      {/* Send Payment Link Dialog */}
      {showLink && <SendPaymentLinkDialog onClose={() => setShowLink(false)} onDone={() => { setShowLink(false); qc.invalidateQueries({ queryKey: ["payments"] }); }} />}
    </AppShell>
  );
}

function NewPaymentDialog({ onClose, onSave, loading }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void; loading: boolean }) {
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState({
    amount: "", method: "cash", status: "completed", receipt_no: "", installment_no: "1",
    paid_at: new Date().toISOString().slice(0, 10), notes: "",
    // plan fields
    total_fee: "", discount: "0", installments: "1",
    first_due_date: new Date().toISOString().slice(0, 10),
  });
  const [showPlan, setShowPlan] = useState(false);

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search", leadSearch],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(leadSearch)}&limit=10`),
    enabled: leadSearch.length > 1,
  });
  const leads: any[] = leadsData?.data ?? [];

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const qc = useQueryClient();
  const planMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/payments/plans", body),
    onSuccess: () => {
      toast.success("Payment plan + installment schedule saved");
      qc.invalidateQueries({ queryKey: ["payment-dues"] });
    },
    onError: () => toast.error("Failed to save plan"),
  });

  const handleSave = () => {
    if (!selectedLead) { toast.error("Select a student"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter valid amount"); return; }
    if (showPlan && form.total_fee && parseFloat(form.total_fee) > 0) {
      planMutation.mutate({
        lead_id: selectedLead.id,
        total_fee: parseFloat(form.total_fee),
        discount: parseFloat(form.discount || "0"),
        installments: parseInt(form.installments || "1"),
        first_due_date: form.first_due_date,
      });
    }
    onSave({
      lead_id: selectedLead.id,
      amount: parseFloat(form.amount),
      method: form.method,
      status: form.status,
      receipt_no: form.receipt_no || null,
      installment_no: parseInt(form.installment_no),
      paid_at: form.paid_at,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Lead search */}
          <div>
            <Label>Student / Lead</Label>
            {selectedLead ? (
              <div className="flex items-center justify-between mt-1 rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedLead.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedLead.phone}</p>
                </div>
                <button className="text-xs text-red-500 hover:underline" onClick={() => setSelectedLead(null)}>Change</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Input placeholder="Search student name or phone…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                {leads.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                    {leads.map((l) => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(""); }}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0">
                        <span className="text-sm font-medium">{l.full_name}</span>
                        <span className="text-xs text-gray-500">{l.phone} · {l.stage}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" min="0" step="0.01" className="mt-1" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => set("method", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1" value={form.paid_at} onChange={(e) => set("paid_at", e.target.value)} />
            </div>
            <div>
              <Label>Receipt No</Label>
              <Input className="mt-1" value={form.receipt_no} onChange={(e) => set("receipt_no", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Installment #</Label>
              <Input type="number" min="1" className="mt-1" value={form.installment_no} onChange={(e) => set("installment_no", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
          </div>

          {/* Optional plan + installment schedule */}
          <div className="border rounded-lg p-3 bg-gray-50/60">
            <button type="button" className="flex items-center gap-2 text-xs font-medium text-blue-600"
              onClick={() => setShowPlan((v) => !v)}>
              <CalendarClock className="h-3.5 w-3.5" />
              {showPlan ? "Hide" : "Set up"} payment plan &amp; installment schedule
            </button>
            {showPlan && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Total Fee (₹)</Label>
                  <Input type="number" className="mt-1" value={form.total_fee} onChange={(e) => set("total_fee", e.target.value)} placeholder="e.g. 25000" />
                </div>
                <div>
                  <Label className="text-xs">Discount (₹)</Label>
                  <Input type="number" className="mt-1" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">No. of Installments</Label>
                  <Input type="number" min="1" max="24" className="mt-1" value={form.installments} onChange={(e) => set("installments", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">First Due Date</Label>
                  <Input type="date" className="mt-1" value={form.first_due_date} onChange={(e) => set("first_due_date", e.target.value)} />
                </div>
                <p className="col-span-2 text-[10px] text-gray-400">
                  Each installment = ₹{fmt((parseFloat(form.total_fee||"0") - parseFloat(form.discount||"0")) / Math.max(1, parseInt(form.installments||"1")))}
                  &nbsp;· Due dates auto-calculated monthly from first due date.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Payment"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send Payment Link Dialog (Razorpay) ──────────────────────
function SendPaymentLinkDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState({ amount: "", description: "", expire_days: "3" });
  const [result, setResult] = useState<{ short_url: string } | null>(null);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search-link", leadSearch],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(leadSearch)}&limit=10`),
    enabled: leadSearch.length > 1,
  });
  const leads: any[] = leadsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/payments/send-link", body),
    onSuccess: (data) => {
      setResult(data.data?.link ?? null);
      toast.success("Payment link created and sent via WhatsApp");
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to create payment link"),
  });

  const handleSend = () => {
    if (!selectedLead) { toast.error("Select a lead"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter valid amount"); return; }
    mutation.mutate({
      lead_id: selectedLead.id,
      amount: parseFloat(form.amount),
      description: form.description || undefined,
      expire_days: parseInt(form.expire_days),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Send Payment Link (Razorpay)</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-green-700 font-medium">Payment link sent via WhatsApp!</p>
            <a href={result.short_url} target="_blank" rel="noopener noreferrer"
              className="block text-blue-600 underline text-sm break-all">{result.short_url}</a>
            <p className="text-xs text-gray-400">Customer can also pay via SMS link sent by Razorpay.</p>
            <Button onClick={onDone} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label>Student / Lead</Label>
              {selectedLead ? (
                <div className="flex items-center justify-between mt-1 rounded-lg border px-3 py-2">
                  <div><p className="text-sm font-medium">{selectedLead.full_name}</p><p className="text-xs text-gray-500">{selectedLead.phone}</p></div>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => setSelectedLead(null)}>Change</button>
                </div>
              ) : (
                <div className="relative mt-1">
                  <Input placeholder="Search student name or phone…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                  {leads.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
                      {leads.map((l) => (
                        <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(""); }}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0">
                          <span className="text-sm font-medium">{l.full_name}</span>
                          <span className="text-xs text-gray-500">{l.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₹) *</Label>
                <Input type="number" min="1" className="mt-1" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Expires in (days)</Label>
                <Input type="number" min="1" max="30" className="mt-1" value={form.expire_days} onChange={(e) => set("expire_days", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Course fee — Batch Jan 2026" />
            </div>
            <p className="text-xs text-gray-400">The payment link will be sent via WhatsApp to the student's registered number. Payment auto-confirms when completed.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Send Link"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
