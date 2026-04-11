import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line,
} from "recharts";
import { Download, TrendingUp, Users, Target, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { apiRequest, getAuthHeaders } from "../lib/queryClient.js";
import { STAGE_LABELS } from "../lib/utils.js";

const TABS = [
  { key: "funnel",      label: "Lead Funnel",   icon: Target },
  { key: "counsellor",  label: "Counsellors",   icon: Users },
  { key: "campaign",    label: "Campaign ROI",  icon: TrendingUp },
  { key: "sla",         label: "SLA / Response",icon: Clock },
];

export function ReportsPage() {
  const [tab, setTab] = useState("funnel");
  const [period, setPeriod] = useState("30d");
  const [exporting, setExporting] = useState(false);

  const { data: funnel }     = useQuery({ queryKey: ["report-funnel"],     enabled: tab === "funnel",      queryFn: () => apiRequest<any>("GET", "/api/reports/funnel") });
  const { data: counsellor } = useQuery({ queryKey: ["report-counsellor"], enabled: tab === "counsellor",  queryFn: () => apiRequest<any>("GET", "/api/reports/counsellor") });
  const { data: campaign }   = useQuery({ queryKey: ["report-campaign"],   enabled: tab === "campaign",    queryFn: () => apiRequest<any>("GET", "/api/reports/campaign-roi") });
  const { data: sla }        = useQuery({ queryKey: ["report-sla"],        enabled: tab === "sla",         queryFn: () => apiRequest<any>("GET", "/api/reports/response-time") });
  const { data: trend }      = useQuery({ queryKey: ["report-trend", period], queryFn: () => apiRequest<any>(`GET`, `/api/reports/conversion?period=${period}`) });

  const handleExport = async (format: "pdf" | "excel") => {
    setExporting(true);
    try {
      const typeMap: Record<string, string> = { funnel: "funnel", counsellor: "counsellor", campaign: "campaign_roi", sla: "conversion" };
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ type: typeMap[tab] ?? "funnel", format }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${tab}-report.${format === "pdf" ? "pdf" : "xlsx"}`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  return (
    <AppShell title="Reports & Analytics">
      {/* Tab bar + export */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${tab === key ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={exporting} onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Funnel */}
      {tab === "funnel" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Stage Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnel?.data?.stages ?? []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tickFormatter={(s) => STAGE_LABELS[s] ?? s} width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Leads"]} labelFormatter={(s) => STAGE_LABELS[s] ?? s} />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lead Trend</CardTitle>
                <select value={period} onChange={(e) => setPeriod(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm">
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend?.data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads_created" stroke="#2563EB" name="New Leads" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="admitted" stroke="#059669" name="Admitted" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Totals */}
          {funnel?.data?.totals && (
            <Card className="lg:col-span-2">
              <CardContent className="grid grid-cols-4 gap-6 p-6">
                {[
                  { label: "Total Leads",   value: funnel.data.totals.total },
                  { label: "Active",         value: funnel.data.totals.active },
                  { label: "Admitted",       value: funnel.data.totals.admitted },
                  { label: "Lost",           value: funnel.data.totals.lost },
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

      {/* Counsellor Performance */}
      {tab === "counsellor" && (
        <Card>
          <CardHeader><CardTitle>Counsellor Performance</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {["Counsellor","Total Leads","Admissions","Conversion","Calls Made","Overdue Tasks","Avg Score"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(counsellor?.data ?? []).map((row: any) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.total_leads}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{row.admissions}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-gray-200">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${row.conversion_rate}%` }} />
                        </div>
                        <span>{row.conversion_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.calls_made}</td>
                    <td className="px-4 py-3">
                      {parseInt(row.overdue_tasks) > 0
                        ? <span className="font-medium text-red-600">{row.overdue_tasks}</span>
                        : <span className="text-green-600">0</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.avg_lead_score}</td>
                  </tr>
                ))}
                {!counsellor?.data?.length && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Campaign ROI */}
      {tab === "campaign" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[700px] text-sm">
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
                      <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{row.source.replace(/_/g," ")}</td>
                      <td className="px-4 py-3">{row.total_leads}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{row.total_admissions}</td>
                      <td className="px-4 py-3">₹{parseInt(row.total_spend).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">₹{parseFloat(row.cost_per_lead).toFixed(0)}</td>
                      <td className="px-4 py-3">₹{parseFloat(row.cost_per_admission).toFixed(0)}</td>
                      <td className="px-4 py-3">{row.conversion_rate}%</td>
                    </tr>
                  ))}
                  {!campaign?.data?.length && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">No campaign data</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SLA / Response Time */}
      {tab === "sla" && (
        <Card>
          <CardHeader><CardTitle>SLA Compliance by Counsellor</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(sla?.data ?? []).map((row: any) => (
                <div key={row.counsellor} className="flex items-center gap-4">
                  <p className="w-36 truncate text-sm font-medium text-gray-900">{row.counsellor}</p>
                  <div className="flex flex-1 items-center gap-3">
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-3 rounded-full ${parseFloat(row.sla_compliance_pct) >= 80 ? "bg-green-500" : parseFloat(row.sla_compliance_pct) >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${row.sla_compliance_pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-gray-900">{row.sla_compliance_pct}%</span>
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
