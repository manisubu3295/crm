import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  Download, TrendingUp, Users, Target, Clock,
  DollarSign, MapPin, Star, BookOpen, Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { apiRequest, getAuthHeaders } from "../lib/queryClient.js";
import { STAGE_LABELS } from "../lib/utils.js";

const TABS = [
  { key: "funnel",      label: "Funnel",       icon: Target },
  { key: "counsellor",  label: "Counsellors",  icon: Users },
  { key: "campaign",    label: "Campaign ROI", icon: TrendingUp },
  { key: "revenue",     label: "Revenue",      icon: DollarSign },
  { key: "source",      label: "Lead Source",  icon: MapPin },
  { key: "nps",         label: "NPS Trend",    icon: Star },
  { key: "batch-fill",  label: "Batch Fill",   icon: BookOpen },
  { key: "placement",   label: "Placements",   icon: Briefcase },
  { key: "sla",         label: "SLA",          icon: Clock },
];

const PIE_COLORS = ["#2563eb","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#be185d"];

export function ReportsPage() {
  const [tab, setTab]         = useState("funnel");
  const [period, setPeriod]   = useState("30d");
  const [fromDate, setFrom]   = useState("");
  const [toDate, setTo]       = useState("");
  const [exporting, setExp]   = useState(false);

  const dateQs = [fromDate && `fromDate=${fromDate}`, toDate && `toDate=${toDate}`].filter(Boolean).join("&");
  const withDate = (path: string) => path + (dateQs ? (path.includes("?") ? "&" : "?") + dateQs : "");

  const { data: funnel }    = useQuery({ queryKey: ["rpt-funnel",    dateQs], enabled: tab==="funnel",     queryFn: () => apiRequest<any>("GET", withDate("/api/reports/funnel")) });
  const { data: counsellor} = useQuery({ queryKey: ["rpt-counsellor",dateQs], enabled: tab==="counsellor", queryFn: () => apiRequest<any>("GET", withDate("/api/reports/counsellor")) });
  const { data: campaign }  = useQuery({ queryKey: ["rpt-campaign",  dateQs], enabled: tab==="campaign",   queryFn: () => apiRequest<any>("GET", withDate("/api/reports/campaign-roi")) });
  const { data: revenue }   = useQuery({ queryKey: ["rpt-revenue",   dateQs], enabled: tab==="revenue",    queryFn: () => apiRequest<any>("GET", withDate("/api/reports/revenue")) });
  const { data: source }    = useQuery({ queryKey: ["rpt-source",    dateQs], enabled: tab==="source",     queryFn: () => apiRequest<any>("GET", withDate("/api/reports/source")) });
  const { data: npsTrend }  = useQuery({ queryKey: ["rpt-nps",       dateQs], enabled: tab==="nps",        queryFn: () => apiRequest<any>("GET", withDate("/api/reports/nps-trend")) });
  const { data: batchFill } = useQuery({ queryKey: ["rpt-batch",     dateQs], enabled: tab==="batch-fill", queryFn: () => apiRequest<any>("GET", "/api/reports/batch-fill") });
  const { data: placement } = useQuery({ queryKey: ["rpt-placement", dateQs], enabled: tab==="placement",  queryFn: () => apiRequest<any>("GET", withDate("/api/reports/placement")) });
  const { data: sla }       = useQuery({ queryKey: ["rpt-sla",       dateQs], enabled: tab==="sla",        queryFn: () => apiRequest<any>("GET", "/api/reports/response-time") });
  const { data: trend }     = useQuery({ queryKey: ["rpt-trend", period],                                  queryFn: () => apiRequest<any>("GET", `/api/reports/conversion?period=${period}`) });

  const handleExport = async (format: "pdf" | "excel") => {
    setExp(true);
    try {
      const typeMap: Record<string, string> = {
        funnel:"funnel", counsellor:"counsellor", campaign:"campaign_roi", sla:"conversion",
      };
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: typeMap[tab] ?? "funnel", format, fromDate: fromDate || undefined, toDate: toDate || undefined }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${tab}-report.${format === "pdf" ? "pdf" : "xlsx"}`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
    finally { setExp(false); }
  };

  return (
    <AppShell title="Reports & Analytics">
      {/* Tab bar */}
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all
              ${tab === key ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Date filter + export */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Input type="date" value={fromDate} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-xs" placeholder="From" />
        <Input type="date" value={toDate}   onChange={(e) => setTo(e.target.value)}   className="h-8 w-36 text-xs" placeholder="To" />
        {(fromDate || toDate) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-indigo-600 underline">Clear</button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport("excel")}><Download className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport("pdf")}><Download className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* ── FUNNEL ── */}
      {tab === "funnel" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Stage Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnel?.data?.stages ?? []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tickFormatter={(s) => STAGE_LABELS[s] ?? s} width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Leads"]} labelFormatter={(s) => STAGE_LABELS[s] ?? s} />
                  <Bar dataKey="count" fill="#2563EB" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Trend</CardTitle>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                  <option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend?.data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize:11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="leads_created" stroke="#2563EB" name="New Leads" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="admitted"      stroke="#059669" name="Admitted"  strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {funnel?.data?.totals && (
            <Card className="lg:col-span-2">
              <CardContent className="grid grid-cols-4 gap-6 p-6">
                {[
                  { label: "Total Leads", value: funnel.data.totals.total },
                  { label: "Active",      value: funnel.data.totals.active },
                  { label: "Admitted",    value: funnel.data.totals.admitted },
                  { label: "Lost",        value: funnel.data.totals.lost },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    <p className="text-sm text-gray-500">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── COUNSELLOR ── */}
      {tab === "counsellor" && (
        <Card>
          <CardHeader><CardTitle>Counsellor Performance</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {["Counsellor","Leads","Admissions","Conv%","Calls","Overdue","Avg Score"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(counsellor?.data ?? []).map((row: any) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3">{row.total_leads}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{row.admissions}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${row.conversion_rate}%` }} />
                        </div>
                        <span>{row.conversion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.calls_made}</td>
                    <td className="px-4 py-3">{parseInt(row.overdue_tasks)>0 ? <span className="text-red-600 font-medium">{row.overdue_tasks}</span> : <span className="text-green-600">0</span>}</td>
                    <td className="px-4 py-3">{row.avg_lead_score}</td>
                  </tr>
                ))}
                {!counsellor?.data?.length && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No data</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── CAMPAIGN ROI ── */}
      {tab === "campaign" && (
        <Card>
          <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {["Campaign","Source","Leads","Admissions","Spend","CPL","CPA","Conv%"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(campaign?.data ?? []).map((row: any) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{String(row.source).replace(/_/g," ")}</td>
                    <td className="px-4 py-3">{row.total_leads}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{row.total_admissions}</td>
                    <td className="px-4 py-3">₹{parseInt(row.total_spend).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">₹{parseFloat(row.cost_per_lead||0).toFixed(0)}</td>
                    <td className="px-4 py-3">₹{parseFloat(row.cost_per_admission||0).toFixed(0)}</td>
                    <td className="px-4 py-3">{row.conversion_rate}%</td>
                  </tr>
                ))}
                {!campaign?.data?.length && <tr><td colSpan={8} className="py-8 text-center text-gray-400">No campaign data</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── REVENUE ── */}
      {tab === "revenue" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Monthly Revenue</CardTitle>
                <span className="text-lg font-bold text-emerald-700">
                  ₹{parseFloat(revenue?.data?.total ?? "0").toLocaleString("en-IN")} total
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenue?.data?.monthly ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize:11 }} tickFormatter={(d) => d.slice(0,7)} />
                  <YAxis tick={{ fontSize:11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} labelFormatter={(d) => d.slice(0,7)} />
                  <Bar dataKey="revenue" fill="#059669" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Revenue by Course</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {["Course","Students","Payments","Revenue"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(revenue?.data?.byCourse ?? []).map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{row.course_name ?? "Unknown"}</td>
                      <td className="px-4 py-3">{row.students}</td>
                      <td className="px-4 py-3">{row.payments}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">₹{parseFloat(row.revenue).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {!revenue?.data?.byCourse?.length && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No revenue data</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SOURCE ATTRIBUTION ── */}
      {tab === "source" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={source?.data ?? []} dataKey="total_leads" nameKey="source" cx="50%" cy="50%" outerRadius={110} label={({ source: s, total_leads }) => `${s} (${total_leads})`} labelLine={false}>
                    {(source?.data ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, _, p) => [v, p.payload.source]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Source Conversion</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {["Source","Leads","Admissions","Conv%","Avg Score"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(source?.data ?? []).map((row: any) => (
                    <tr key={row.source} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium capitalize">{row.source}</td>
                      <td className="px-4 py-3">{row.total_leads}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{row.admissions}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-200">
                            <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${row.conversion_rate}%` }} />
                          </div>
                          <span>{row.conversion_rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.avg_score}</td>
                    </tr>
                  ))}
                  {!source?.data?.length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── NPS TREND ── */}
      {tab === "nps" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>NPS Score Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={npsTrend?.data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize:11 }} tickFormatter={(d) => d.slice(0,7)} />
                  <YAxis domain={[-100,100]} tick={{ fontSize:11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="nps_score" stroke="#7c3aed" name="NPS Score" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="avg_score"  stroke="#2563eb" name="Avg Score (0-10)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>NPS by Course</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {["Course","Responses","Avg Score","NPS Score"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(npsTrend?.data?.byCourse ?? []).map((row: any, i: number) => {
                    const nps = parseFloat(row.nps_score ?? "0");
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.course_name ?? "Unknown"}</td>
                        <td className="px-4 py-3">{row.responses}</td>
                        <td className="px-4 py-3">{row.avg_score}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: nps >= 50 ? "#059669" : nps >= 0 ? "#d97706" : "#dc2626" }}>
                          {row.nps_score ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {!npsTrend?.data?.byCourse?.length && <tr><td colSpan={4} className="py-8 text-center text-gray-400">No NPS data yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── BATCH FILL ── */}
      {tab === "batch-fill" && (
        <div className="space-y-4">
          {batchFill?.meta && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Batches", value: batchFill.meta.total, color: "text-gray-800" },
                { label: "Full",          value: batchFill.meta.full,  color: "text-red-600" },
                { label: "Healthy (≥70%)",value: batchFill.meta.healthy,color:"text-emerald-600" },
                { label: "Low (<70%)",    value: batchFill.meta.low,   color: "text-amber-600" },
              ].map(({ label, value, color }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Batch Fill Rates</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {["Batch","Course","Enrolled","Capacity","Fill%","Seats Left","Status"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(batchFill?.data ?? []).map((row: any) => {
                    const pct = parseFloat(row.fill_pct ?? "0");
                    const color = pct >= 100 ? "text-red-600" : pct >= 70 ? "text-emerald-600" : "text-amber-600";
                    return (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.batch_name}</td>
                        <td className="px-4 py-3 text-indigo-600">{row.course_name}</td>
                        <td className="px-4 py-3">{row.enrolled}</td>
                        <td className="px-4 py-3">{row.capacity}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-gray-200">
                              <div className={`h-2 rounded-full ${pct>=100?"bg-red-500":pct>=70?"bg-emerald-500":"bg-amber-500"}`} style={{ width: `${Math.min(100,pct)}%` }} />
                            </div>
                            <span className={`font-semibold ${color}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{parseInt(row.seats_left) <= 0 ? <span className="text-red-600 font-semibold">FULL</span> : row.seats_left}</td>
                        <td className="px-4 py-3">{row.is_active ? <span className="text-emerald-600">Active</span> : <span className="text-gray-400">Closed</span>}</td>
                      </tr>
                    );
                  })}
                  {!batchFill?.data?.length && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No batches</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PLACEMENTS ── */}
      {tab === "placement" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Placements by Course</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {["Course","Students","Placed","Rate%","Avg Package (LPA)"].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(placement?.data?.byCourse ?? []).map((row: any) => (
                    <tr key={row.course_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{row.course_name ?? "Unknown"}</td>
                      <td className="px-4 py-3">{row.total_students}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{row.placed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-200">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${row.placement_rate}%` }} />
                          </div>
                          <span>{row.placement_rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.avg_package_lpa ? `${row.avg_package_lpa} LPA` : "—"}</td>
                    </tr>
                  ))}
                  {!placement?.data?.byCourse?.length && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No placement data</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Top Hiring Companies</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(placement?.data?.topCompanies ?? []).map((row: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 text-xs font-bold text-gray-400">{i+1}</div>
                    <div className="flex-1 font-medium text-sm">{row.company}</div>
                    <div className="text-sm text-emerald-700 font-semibold">{row.placements} hired</div>
                    {row.avg_package_lpa && <div className="text-xs text-gray-400">{row.avg_package_lpa} LPA avg</div>}
                  </div>
                ))}
                {!placement?.data?.topCompanies?.length && <p className="text-center text-gray-400 py-4">No data yet</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Placements</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={placement?.data?.trend ?? []}>
                  <XAxis dataKey="month" tick={{ fontSize:11 }} tickFormatter={(d) => d.slice(0,7)} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip />
                  <Bar dataKey="placements" fill="#059669" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SLA ── */}
      {tab === "sla" && (
        <Card>
          <CardHeader><CardTitle>SLA Compliance by Counsellor</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(sla?.data ?? []).map((row: any) => (
                <div key={row.counsellor} className="flex items-center gap-4">
                  <p className="w-36 truncate text-sm font-medium">{row.counsellor}</p>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div className={`h-3 rounded-full ${parseFloat(row.sla_compliance_pct)>=80?"bg-green-500":parseFloat(row.sla_compliance_pct)>=50?"bg-yellow-500":"bg-red-500"}`}
                        style={{ width: `${row.sla_compliance_pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">{row.sla_compliance_pct}%</span>
                  </div>
                  <span className="text-xs text-gray-500">{row.within_sla}/{row.total_sla_cases} within SLA</span>
                </div>
              ))}
              {!sla?.data?.length && <p className="py-8 text-center text-gray-400">No SLA data yet</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
