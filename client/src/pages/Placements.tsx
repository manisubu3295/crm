import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Trophy, TrendingUp, Building2, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Label } from "../components/ui/label.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Textarea } from "../components/ui/textarea.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

function fmt(n: unknown) {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? "—" : v.toLocaleString("en-IN");
}

export function PlacementsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: statsData } = useQuery({
    queryKey: ["placement-stats"],
    queryFn: () => apiRequest<any>("GET", "/api/placements/stats"),
  });
  const { data: byCourseData } = useQuery({
    queryKey: ["placements-by-course"],
    queryFn: () => apiRequest<any>("GET", "/api/placements/by-course"),
  });
  const { data: topCompData } = useQuery({
    queryKey: ["top-companies"],
    queryFn: () => apiRequest<any>("GET", "/api/placements/top-companies"),
  });
  const { data: listData, isLoading } = useQuery({
    queryKey: ["placements", search, verified],
    queryFn: () => apiRequest<any>("GET", `/api/placements?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}${verified ? `&verified=${verified}` : ""}`),
    staleTime: 30_000,
  });

  const stats = statsData?.data;
  const byCourse: any[] = byCourseData?.data ?? [];
  const topCompanies: any[] = topCompData?.data ?? [];
  const placements: any[] = listData?.data ?? [];

  const verifyMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => apiRequest<any>("PATCH", `/api/placements/${id}`, { verified: true }),
    onSuccess: () => { toast.success("Placement verified"); qc.invalidateQueries({ queryKey: ["placements"] }); qc.invalidateQueries({ queryKey: ["placement-stats"] }); },
    onError: () => toast.error("Failed to verify"),
  });

  const KPIS = [
    { label: "Total Placed", value: fmt(stats?.total_placed), icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Placement Rate", value: `${stats?.placement_rate ?? 0}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Avg Package", value: stats?.avg_package ? `${stats.avg_package} LPA` : "—", icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Companies", value: fmt(stats?.companies_count), icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "This Year", value: fmt(stats?.this_year), icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <AppShell title="Placements & Alumni">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
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

      {/* By Course + Top Companies */}
      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Placements by Course</CardTitle></CardHeader>
          <CardContent className="p-0">
            {byCourse.length === 0 ? <p className="px-4 py-6 text-center text-xs text-gray-400">No data yet</p> : (
              <div className="divide-y">
                {byCourse.map((r) => (
                  <div key={r.course_id} className="flex items-center justify-between px-4 py-2">
                    <p className="text-xs font-medium">{r.course}</p>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600">{r.placed} placed</p>
                      {r.avg_package && <p className="text-[10px] text-gray-400">{r.avg_package} LPA avg</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Hiring Companies</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topCompanies.length === 0 ? <p className="px-4 py-6 text-center text-xs text-gray-400">No data yet</p> : (
              <div className="divide-y">
                {topCompanies.slice(0, 8).map((r, i) => (
                  <div key={r.company} className="flex items-center gap-3 px-4 py-2">
                    <span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-purple-600">{r.count} hires</p>
                      {r.avg_package && <p className="text-[10px] text-gray-400">{r.avg_package} LPA</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Placements Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-sm">All Placements</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Student, company, role…" className="pl-8 h-8 text-xs w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={verified || "all"} onValueChange={(v) => setVerified(v === "all" ? "" : v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4" /> Add Placement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-gray-50/50">
                <tr>
                  {["Student", "Course", "Company", "Role", "Package", "Date", "Mode", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading…</td></tr>
                ) : placements.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No placements found</td></tr>
                ) : placements.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{p.student_name}</p>
                      <p className="text-[10px] text-gray-400">{p.student_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.course_name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs font-medium">{p.company}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.role}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-700">
                      {p.package_lpa ? `${p.package_lpa} LPA` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.placement_date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">{p.mode}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {p.verified ? (
                        <span className="text-[10px] text-green-700 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <button onClick={() => verifyMutation.mutate({ id: p.id })}
                          className="text-[10px] text-blue-600 hover:underline">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showNew && <NewPlacementDialog onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); qc.invalidateQueries({ queryKey: ["placements"] }); qc.invalidateQueries({ queryKey: ["placement-stats"] }); }} />}
    </AppShell>
  );
}

function NewPlacementDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState({
    company: "", role: "", package_lpa: "", placement_date: new Date().toISOString().slice(0, 10),
    mode: "campus", location: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search-pl", leadSearch],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(leadSearch)}&stage=admitted&limit=10`),
    enabled: leadSearch.length > 1,
  });
  const leads: any[] = leadsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/placements", body),
    onSuccess: () => { toast.success("Placement added"); onDone(); },
    onError: () => toast.error("Failed to add placement"),
  });

  const handleSave = () => {
    if (!selectedLead) { toast.error("Select a student"); return; }
    if (!form.company || !form.role) { toast.error("Company and role are required"); return; }
    mutation.mutate({
      lead_id: selectedLead.id,
      company: form.company,
      role: form.role,
      package_lpa: form.package_lpa ? parseFloat(form.package_lpa) : null,
      placement_date: form.placement_date,
      mode: form.mode,
      location: form.location || null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Placement</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Student (admitted)</Label>
            {selectedLead ? (
              <div className="flex items-center justify-between mt-1 rounded-lg border px-3 py-2">
                <div><p className="text-sm font-medium">{selectedLead.full_name}</p><p className="text-xs text-gray-500">{selectedLead.phone}</p></div>
                <button className="text-xs text-red-500 hover:underline" onClick={() => setSelectedLead(null)}>Change</button>
              </div>
            ) : (
              <div className="relative mt-1">
                <Input placeholder="Search admitted student…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                {leads.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-40 overflow-y-auto">
                    {leads.map((l) => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(""); }}
                        className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-gray-50 border-b last:border-0">
                        <span className="text-xs font-medium">{l.full_name}</span>
                        <span className="text-[10px] text-gray-400">{l.phone} · {l.course_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Company *</Label>
              <Input className="mt-1" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Infosys, TCS, Wipro…" />
            </div>
            <div className="col-span-2">
              <Label>Role *</Label>
              <Input className="mt-1" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Software Engineer, Data Analyst…" />
            </div>
            <div>
              <Label>Package (LPA)</Label>
              <Input type="number" step="0.1" min="0" className="mt-1" value={form.package_lpa} onChange={(e) => set("package_lpa", e.target.value)} placeholder="e.g. 4.5" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" className="mt-1" value={form.placement_date} onChange={(e) => set("placement_date", e.target.value)} />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="campus">Campus</SelectItem>
                  <SelectItem value="off_campus">Off Campus</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input className="mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="City" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Add Placement"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
