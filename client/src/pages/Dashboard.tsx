import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { Users, CheckSquare, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, CreditCard, IndianRupee } from "lucide-react";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { apiRequest } from "../lib/queryClient.js";
import { useTaskSummary } from "../hooks/useFollowUps.js";
import { STAGE_COLORS, STAGE_LABELS, formatDateTime } from "../lib/utils.js";

const CHART_COLORS = ["#4F46E5","#7C3AED","#0891B2","#D97706","#059669","#DC2626","#6B7280","#0EA5E9"];

export function DashboardPage() {
  const { data: funnel }      = useQuery({ queryKey: ["report", "funnel"],  queryFn: () => apiRequest<any>("GET", "/api/reports/funnel") });
  const { data: trend }       = useQuery({ queryKey: ["report", "trend"],   queryFn: () => apiRequest<any>("GET", "/api/reports/conversion?period=7d") });
  const { data: taskSum }     = useTaskSummary();
  const { data: payStats }    = useQuery({ queryKey: ["payment-stats"], queryFn: () => apiRequest<any>("GET", "/api/payments/stats"), staleTime: 60_000 });
  const { data: recentLeads } = useQuery({
    queryKey: ["leads", { limit: 5 }],
    queryFn: () => apiRequest<any>("GET", "/api/leads?limit=5&page=1"),
  });

  const stages    = funnel?.data?.stages ?? [];
  const totals    = funnel?.data?.totals;
  const trendData = trend?.data?.trend ?? [];
  const summary   = taskSum?.data;

  const conversionRate = totals
    ? Math.round((parseInt(totals["admitted"] ?? "0") / Math.max(parseInt(totals["total"] ?? "1"), 1)) * 100)
    : 0;

  const kpis = [
    {
      label: "Total Leads",
      value: totals?.["total"] ?? "—",
      sub: "all time",
      icon: Users,
      trend: "up",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      iconGrad: "from-indigo-500 to-blue-600",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: "new → admitted",
      icon: TrendingUp,
      trend: conversionRate >= 10 ? "up" : "down",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      iconGrad: "from-emerald-500 to-teal-600",
    },
    {
      label: "Tasks Due Today",
      value: summary?.["due_today"] ?? "—",
      sub: `${summary?.["overdue"] ?? 0} overdue`,
      icon: CheckSquare,
      trend: "neutral",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      iconGrad: "from-amber-500 to-orange-500",
    },
    {
      label: "Overdue Tasks",
      value: summary?.["overdue"] ?? "—",
      sub: "need attention",
      icon: AlertTriangle,
      trend: (summary?.["overdue"] ?? 0) > 0 ? "down" : "up",
      bgColor: "bg-rose-50",
      textColor: "text-rose-600",
      iconGrad: "from-rose-500 to-pink-600",
    },
  ];

  return (
    <AppShell title="Dashboard">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                    <p className="text-2xl font-bold text-foreground">{k.value}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {k.trend === "up"   && <ArrowUpRight   className="h-3 w-3 text-emerald-500" />}
                      {k.trend === "down" && <ArrowDownRight className="h-3 w-3 text-rose-500" />}
                      {k.sub}
                    </p>
                  </div>
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.bgColor}`}>
                    <Icon className={`h-5 w-5 ${k.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Collected Today",   value: `₹${parseFloat(payStats?.data?.today ?? "0").toLocaleString("en-IN")}`,       icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "This Month",         value: `₹${parseFloat(payStats?.data?.this_month ?? "0").toLocaleString("en-IN")}`, icon: CreditCard,  color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "All Time Revenue",   value: `₹${parseFloat(payStats?.data?.all_time ?? "0").toLocaleString("en-IN")}`,   icon: TrendingUp,  color: "text-blue-600",  bg: "bg-blue-50" },
          { label: "Pending Payments",   value: `₹${parseFloat(payStats?.data?.pending ?? "0").toLocaleString("en-IN")}`,    icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                    <p className="text-2xl font-bold text-foreground">{k.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.bg}`}>
                    <Icon className={`h-5 w-5 ${k.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lead Funnel */}
        <Card className="lg:col-span-1 border-0 shadow-sm">
          <CardHeader><CardTitle>Lead Funnel</CardTitle></CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stages} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(s) => STAGE_LABELS[s] ?? s} width={78} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12, color: "#f1f5f9" }}
                    formatter={(v) => [v, "Leads"]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {stages.map((s: any, i: number) => (
                      <Cell key={s.stage} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>7-Day Lead Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12, color: "#f1f5f9" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="leads_created" stroke="#4F46E5" name="New Leads" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="admitted"      stroke="#059669" name="Admitted"  strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Distribution Pie */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle>Leads by Stage</CardTitle></CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stages.filter((s: any) => parseInt(s.count) > 0)}
                    cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                    dataKey="count" nameKey="stage"
                    label={({ stage, pct }) => `${STAGE_LABELS[stage] ?? stage} ${pct}%`}
                    labelLine={false}
                  >
                    {stages.filter((s: any) => parseInt(s.count) > 0).map((s: any, i: number) => (
                      <Cell key={s.stage} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12, color: "#f1f5f9" }}
                    formatter={(v: number, name: string) => [v, STAGE_LABELS[name] ?? name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader><CardTitle>Recent Leads</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Lead</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Assigned</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {(recentLeads?.data ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b border-border/40 transition-colors hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{l.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{l.lead_no}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${STAGE_COLORS[l.stage]}`}>
                        {STAGE_LABELS[l.stage] ?? l.stage}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{l.assigned_to_name ?? "—"}</td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recentLeads?.data?.length && (
              <p className="py-10 text-center text-sm text-muted-foreground">No leads yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
