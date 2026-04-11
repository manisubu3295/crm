import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search, Printer, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Separator } from "../components/ui/separator.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export function QuotationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: listData, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: () => apiRequest<any>("GET", "/api/quotations"),
    staleTime: 30_000,
  });
  const quotes: any[] = listData?.data ?? [];
  const filtered = search ? quotes.filter((q) =>
    q.quote_no?.toLowerCase().includes(search.toLowerCase()) ||
    q.lead_name?.toLowerCase().includes(search.toLowerCase()) ||
    q.company_name?.toLowerCase().includes(search.toLowerCase())
  ) : quotes;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest<any>("PATCH", `/api/quotations/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });

  return (
    <AppShell title="Quotations">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by quote#, lead or company…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Quote</Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <FileText className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>No quotations yet. Create your first quote.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Quote #","Lead / Company","Date","Valid Until","Amount","Status",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700">{q.quote_no}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{q.lead_name ?? "—"}</p>
                    {q.company_name && <p className="text-xs text-gray-400">{q.company_name}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                  <td className="px-4 py-3 font-semibold">₹{parseFloat(q.total ?? 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Select value={q.status} onValueChange={(v) => statusMutation.mutate({ id: q.id, status: v })}>
                      <SelectTrigger className="h-7 w-28 text-xs border-0 p-0 shadow-none focus:ring-0">
                        <Badge className={`text-[11px] cursor-pointer ${STATUS_STYLE[q.status] ?? "bg-gray-100"}`}>{q.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {["draft","sent","accepted","rejected","expired"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(q)}><FileText className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewQuoteDialog onClose={() => setShowNew(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ["quotations"] }); setShowNew(false); }} />}
      {selected && <QuoteDetailDialog quoteId={selected.id} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}

// ─── New Quote Dialog ─────────────────────────────────────────
function NewQuoteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", qty: 1, rate: 0 }]);

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search", leadSearch],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(leadSearch)}&limit=8`),
    enabled: leadSearch.length > 1,
  });
  const leads: any[] = leadsData?.data ?? [];

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const total = subtotal - parseFloat(discount || "0");

  const mutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>("POST", "/api/quotations", body),
    onSuccess: () => { toast.success("Quotation created"); onCreated(); },
    onError: () => toast.error("Failed to create quotation"),
  });

  function updateItem(idx: number, key: string, val: string | number) {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  }
  function addItem() { setItems((p) => [...p, { description: "", qty: 1, rate: 0 }]); }
  function removeItem(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)); }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Lead */}
          <div>
            <Label>Lead *</Label>
            {selectedLead ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50">
                <div><p className="text-sm font-medium">{selectedLead.full_name}</p><p className="text-xs text-gray-400">{selectedLead.phone}</p></div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedLead(null)}>Change</Button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Input placeholder="Search lead…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                {leads.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-36 overflow-y-auto">
                    {leads.map((l) => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(""); }}
                        className="flex w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0 text-sm">
                        {l.full_name} · {l.phone}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3" /> Add</Button></div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-xs text-gray-400 font-medium px-1">
                <span className="col-span-6">Description</span><span className="col-span-2 text-center">Qty</span><span className="col-span-3 text-right">Rate</span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 items-center">
                  <Input className="col-span-6 h-8 text-xs" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Course / service" />
                  <Input className="col-span-2 h-8 text-xs text-center" type="number" min="1" value={it.qty} onChange={(e) => updateItem(idx, "qty", parseInt(e.target.value) || 1)} />
                  <Input className="col-span-3 h-8 text-xs text-right" type="number" min="0" value={it.rate} onChange={(e) => updateItem(idx, "rate", parseFloat(e.target.value) || 0)} />
                  {items.length > 1 && (
                    <Button size="sm" variant="ghost" className="col-span-1 h-8 p-0" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Discount</span>
              <Input className="h-7 w-28 text-right text-xs" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valid Until</Label><Input className="mt-1" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!selectedLead || mutation.isPending || items.every((i) => !i.description)}
            onClick={() => mutation.mutate({ lead_id: selectedLead.id, items, discount: parseFloat(discount || "0"), subtotal, total, valid_until: validUntil || null, notes })}>
            {mutation.isPending ? "Creating…" : "Create Quotation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quote Detail / Print Dialog ─────────────────────────────
function QuoteDetailDialog({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["quotation", quoteId],
    queryFn: () => apiRequest<any>("GET", `/api/quotations/${quoteId}`),
  });
  const q = data?.data;

  function handlePrint() {
    window.print();
  }

  if (!q) return <Dialog open onOpenChange={onClose}><DialogContent><p className="p-8 text-center text-gray-400">Loading…</p></DialogContent></Dialog>;

  const items: any[] = Array.isArray(q.items) ? q.items : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{q.quote_no}</span>
            <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="h-3.5 w-3.5" /> Print</Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 print:text-black">
          <div className="flex justify-between">
            <div><p className="text-sm font-semibold">{q.lead_name}</p>{q.company_name && <p className="text-xs text-gray-500">{q.company_name}</p>}</div>
            <div className="text-right text-xs text-gray-500">
              <p>Date: {formatDate(q.created_at)}</p>
              {q.valid_until && <p>Valid: {formatDate(q.valid_until)}</p>}
              <Badge className={`mt-1 text-[11px] ${STATUS_STYLE[q.status] ?? "bg-gray-100"}`}>{q.status}</Badge>
            </div>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-500">Description</th>
                  <th className="px-3 py-2 text-center text-xs text-gray-500">Qty</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500">Rate</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{it.description}</td>
                    <td className="px-3 py-2 text-center">{it.qty}</td>
                    <td className="px-3 py-2 text-right">₹{parseFloat(it.rate).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right">₹{(it.qty * it.rate).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{parseFloat(q.subtotal ?? 0).toLocaleString("en-IN")}</span></div>
            {parseFloat(q.discount ?? 0) > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span>-₹{parseFloat(q.discount).toLocaleString("en-IN")}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{parseFloat(q.total ?? 0).toLocaleString("en-IN")}</span></div>
          </div>
          {q.notes && <p className="text-xs text-gray-500 italic">{q.notes}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
