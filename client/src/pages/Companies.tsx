import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Plus, Search, Phone, Mail, Globe,
  TrendingUp, DollarSign, Users, Handshake, ChevronRight,
  Pencil, X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

function fmt(n: unknown) { const v = parseFloat(String(n ?? 0)); return isNaN(v) ? "0" : v.toLocaleString("en-IN"); }

const DEAL_STAGES = ["prospect","proposal","negotiation","won","lost"];
const DEAL_COLORS: Record<string, string> = {
  prospect: "bg-slate-100 text-slate-700", proposal: "bg-blue-100 text-blue-700",
  negotiation: "bg-amber-100 text-amber-700", won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export function CompaniesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: statsData } = useQuery({ queryKey: ["company-stats"], queryFn: () => apiRequest<any>("GET", "/api/companies/stats") });
  const { data: listData, isLoading } = useQuery({
    queryKey: ["companies", search],
    queryFn: () => apiRequest<any>("GET", `/api/companies?search=${encodeURIComponent(search)}&limit=100`),
    staleTime: 30_000,
  });

  const stats = statsData?.data;
  const companies: any[] = listData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/companies", body),
    onSuccess: () => { toast.success("Company created"); setShowNew(false); qc.invalidateQueries({ queryKey: ["companies"] }); qc.invalidateQueries({ queryKey: ["company-stats"] }); },
    onError: () => toast.error("Failed to create company"),
  });

  const KPIS = [
    { label: "Total Companies", value: stats?.total_companies ?? 0, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Active Deals", value: stats?.active_deals ?? 0, icon: Handshake, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Won Deals", value: stats?.won_deals ?? 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Won Value", value: `₹${fmt(stats?.won_value)}`, icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <AppShell title="Companies / SME">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {KPIS.map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </div>
              <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${k.bg}`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm">All Companies</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Search company, contact…" className="pl-8 h-8 text-xs w-52"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> Add Company</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Building2 className="mx-auto h-10 w-10 text-gray-200 mb-2" />
              <p className="text-sm">No companies yet. Add your first SME client.</p>
            </div>
          ) : (
            <div className="divide-y">
              {companies.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => setSelected(c)}>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white text-sm font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <div className="flex flex-wrap gap-3 mt-0.5">
                        {c.industry && <span className="text-xs text-gray-500">{c.industry}</span>}
                        {c.contact_person && <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="h-3 w-3" />{c.contact_person}</span>}
                        {c.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.city && <span className="text-xs text-gray-400">{c.city}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {parseInt(c.active_deals) > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">{c.active_deals} deals</Badge>
                    )}
                    {parseFloat(c.won_value) > 0 && (
                      <span className="text-xs font-bold text-emerald-700">₹{fmt(c.won_value)}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showNew && (
        <CompanyFormDialog
          title="New Company"
          onClose={() => setShowNew(false)}
          onSave={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {selected && (
        <CompanyDetailDialog company={selected} onClose={() => setSelected(null)} />
      )}
    </AppShell>
  );
}

// ─── Company Detail Dialog ────────────────────────────────────
function CompanyDetailDialog({ company, onClose }: { company: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [showDeal, setShowDeal] = useState(false);

  const { data } = useQuery({
    queryKey: ["company-detail", company.id],
    queryFn: () => apiRequest<any>("GET", `/api/companies/${company.id}`),
  });
  const detail = data?.data ?? company;

  const dealMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", `/api/companies/${company.id}/deals`, body),
    onSuccess: () => { toast.success("Deal created"); setShowDeal(false); qc.invalidateQueries({ queryKey: ["company-detail", company.id] }); },
    onError: () => toast.error("Failed to create deal"),
  });

  const patchDeal = useMutation({
    mutationFn: ({ id, ...rest }: any) => apiRequest<any>("PATCH", `/api/companies/deals/${id}`, rest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-detail", company.id] }); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-600" />{detail.name}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals ({detail.deals?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({detail.contacts?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Industry", detail.industry], ["Contact", detail.contact_person],
                ["Phone", detail.phone], ["Email", detail.email],
                ["City", detail.city], ["GST", detail.gst_number],
                ["Website", detail.website], ["Assigned To", detail.assigned_to_name],
              ].map(([k, v]) => v ? (
                <div key={k}>
                  <span className="text-xs text-gray-500">{k}</span>
                  <p className="font-medium">{v}</p>
                </div>
              ) : null)}
            </div>
            {detail.notes && <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{detail.notes}</div>}
          </TabsContent>

          <TabsContent value="deals" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowDeal(true)}><Plus className="h-3.5 w-3.5" /> New Deal</Button>
            </div>
            {(detail.deals ?? []).length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No deals yet. Add the first deal for this company.</p>
            ) : (
              <div className="space-y-2">
                {(detail.deals ?? []).map((d: any) => (
                  <div key={d.id} className="flex items-start justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-sm">{d.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className={`text-[10px] ${DEAL_COLORS[d.stage]}`}>{d.stage}</Badge>
                        {d.course_name && <span className="text-xs text-gray-500">{d.course_name}</span>}
                        <span className="text-xs font-semibold text-emerald-700">₹{fmt(d.total_value)}</span>
                        <span className="text-xs text-gray-400">{d.trainees_count} trainees</span>
                      </div>
                    </div>
                    <Select value={d.stage} onValueChange={(stage) => patchDeal.mutate({ id: d.id, stage })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            {(detail.contacts ?? []).length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No contacts linked yet.</p>
            ) : (
              <div className="space-y-2">
                {(detail.contacts ?? []).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {c.lead_name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.lead_name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{c.role ?? "Contact"} · {c.lead_phone}</p>
                    </div>
                    {c.is_primary && <Badge className="ml-auto bg-green-100 text-green-700 text-[10px]">Primary</Badge>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      {showDeal && (
        <DealFormDialog
          onClose={() => setShowDeal(false)}
          onSave={(d) => dealMutation.mutate(d)}
          loading={dealMutation.isPending}
        />
      )}
    </Dialog>
  );
}

// ─── Forms ────────────────────────────────────────────────────
function CompanyFormDialog({ title, initial, onClose, onSave, loading }: {
  title: string; initial?: any; onClose: () => void; onSave: (d: Record<string, unknown>) => void; loading: boolean;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "", industry: initial?.industry ?? "", contact_person: initial?.contact_person ?? "",
    phone: initial?.phone ?? "", email: initial?.email ?? "", city: initial?.city ?? "",
    gst_number: initial?.gst_number ?? "", website: initial?.website ?? "", notes: initial?.notes ?? "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2"><Label>Company Name *</Label><Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Industry</Label><Input className="mt-1" value={f.industry} onChange={(e) => set("industry", e.target.value)} /></div>
          <div><Label>Contact Person</Label><Input className="mt-1" value={f.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></div>
          <div><Label>Phone</Label><Input className="mt-1" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          <div><Label>Email</Label><Input className="mt-1" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>City</Label><Input className="mt-1" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
          <div><Label>GST Number</Label><Input className="mt-1" value={f.gst_number} onChange={(e) => set("gst_number", e.target.value)} /></div>
          <div className="col-span-2"><Label>Website</Label><Input className="mt-1" value={f.website} onChange={(e) => set("website", e.target.value)} /></div>
          <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(f)} disabled={loading || !f.name}>{loading ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DealFormDialog({ onClose, onSave, loading }: { onClose: () => void; onSave: (d: Record<string, unknown>) => void; loading: boolean }) {
  const { data: coursesData } = useQuery({ queryKey: ["courses"], queryFn: () => apiRequest<any>("GET", "/api/admin/courses") });
  const courses: any[] = coursesData?.data ?? [];
  const [f, setF] = useState({ name: "", course_id: "", total_value: "", trainees_count: "1", stage: "prospect", expected_close_date: "", notes: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Deal Name *</Label><Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 10-seat Full Stack batch" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Course</Label>
              <Select value={f.course_id || "none"} onValueChange={(v) => set("course_id", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Stage</Label>
              <Select value={f.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total Value (₹)</Label><Input className="mt-1" type="number" value={f.total_value} onChange={(e) => set("total_value", e.target.value)} /></div>
            <div><Label>Trainees</Label><Input className="mt-1" type="number" min="1" value={f.trainees_count} onChange={(e) => set("trainees_count", e.target.value)} /></div>
          </div>
          <div><Label>Expected Close</Label><Input className="mt-1" type="date" value={f.expected_close_date} onChange={(e) => set("expected_close_date", e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea className="mt-1" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...f, total_value: parseFloat(f.total_value)||0, trainees_count: parseInt(f.trainees_count)||1, course_id: f.course_id || undefined })} disabled={loading || !f.name}>{loading ? "Saving…" : "Create Deal"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
