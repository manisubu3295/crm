import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  Users, CheckSquare, TrendingUp, AlertTriangle, ArrowUpRight,
  ArrowDownRight, CreditCard, IndianRupee, Video, Star,
  Radio, Clock, Sparkles,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { apiRequest } from "../lib/queryClient.js";
import { useTaskSummary } from "../hooks/useFollowUps.js";
import { STAGE_COLORS, STAGE_LABELS, formatDateTime } from "../lib/utils.js";
import { useAuth } from "../lib/auth.js";

/* ── Material-inspired chart palette ───────────────────────── */
const CHART_COLORS = [
  "#1976D2", "#2E7D32", "#F57C00", "#C2185B",
  "#7B1FA2", "#0288D1", "#5D4037", "#455A64",
];

/* ── Animated number counter ────────────────────────────────── */
function AnimatedNumber({ value }: { value: string | number }) {
  const raw = String(value ?? "—");
  if (raw === "—" || raw === "" || raw === "undefined") return <>{raw}</>;

  const isRupee   = raw.startsWith("₹");
  const isPercent = raw.endsWith("%");
  const cleaned   = raw.replace(/[₹%,\s]/g, "");
  const num       = parseFloat(cleaned);

  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isNaN(num) || num <= 0) { setCount(0); return; }
    const start    = performance.now();
    const duration = 1200;
    const animate  = (ts: number) => {
      const p     = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * num));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [num]);

  if (isNaN(num)) return <>{raw}</>;
  const formatted = isRupee
    ? `₹${count.toLocaleString("en-IN")}`
    : isPercent
    ? `${count}%`
    : count.toLocaleString("en-IN");
  return <>{formatted}</>;
}

/* ── Scroll-reveal section wrapper ─────────────────────────── */
function Section({
  children, delay = 0, className,
}: {
  children: ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className ?? ""}`}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(20px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Section heading with accent bar ──────────────────────── */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="h-4 w-[3px] rounded-full bg-gradient-to-b from-blue-400 to-cyan-500" />
      <h2 className="text-[11px] font-bold tracking-[0.12em] text-blue-400/70 uppercase">
        {children}
      </h2>
    </div>
  );
}

/* ── KPI card ───────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  accent:   string; // border color class
  iconBg:   string;
  iconColor:string;
  gradFrom: string;
  delay?:   number;
}
function KpiCard({ label, value, sub, icon: Icon, trend, accent, iconBg, iconColor, gradFrom, delay = 0 }: KpiCardProps) {
  return (
    <div
      className={`anim-fade-up hover-shimmer group relative overflow-hidden rounded-xl border ${accent} bg-gradient-to-br ${gradFrom} to-transparent p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative orb */}
      <div className={`anim-orb pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full ${iconBg} blur-2xl opacity-40`} />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground/80 uppercase truncate">
            {label}
          </p>
          <p className="text-[28px] font-extrabold leading-none text-white">
            <AnimatedNumber value={value} />
          </p>
          {sub && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              {trend === "up"   && <ArrowUpRight   className="h-3 w-3 text-emerald-400" />}
              {trend === "down" && <ArrowDownRight className="h-3 w-3 text-rose-400" />}
              {sub}
            </p>
          )}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ring-1 ring-white/8`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

/* ── Tooltip style shared across charts ────────────────────── */
const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E0E0E0",
  borderRadius: 10,
  fontSize: 12,
  color: "#263238",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ══════════════════════════════════════════════════════════════ */
export function DashboardPage() {
  const { user }          = useAuth();
  const { data: funnel }  = useQuery({ queryKey: ["report", "funnel"],   queryFn: () => apiRequest<any>("GET", "/api/reports/funnel") });
  const { data: trend }   = useQuery({ queryKey: ["report", "trend"],    queryFn: () => apiRequest<any>("GET", "/api/reports/conversion?period=7d") });
  const { data: taskSum } = useTaskSummary();
  const { data: payStats }    = useQuery({ queryKey: ["payment-stats"],   queryFn: () => apiRequest<any>("GET", "/api/payments/stats"),           staleTime: 60_000 });
  const { data: demosToday }  = useQuery({ queryKey: ["demos-today"],     queryFn: () => apiRequest<any>("GET", "/api/demos?status=scheduled&limit=10"), staleTime: 60_000 });
  const { data: duesData }    = useQuery({ queryKey: ["dues-summary"],    queryFn: () => apiRequest<any>("GET", "/api/payments/dues?days=7"),     staleTime: 60_000 });
  const { data: npsStats }    = useQuery({ queryKey: ["nps-dash"],        queryFn: () => apiRequest<any>("GET", "/api/nps/stats"),                staleTime: 300_000 });
  const { data: broadcasts }  = useQuery({ queryKey: ["broadcasts-dash"], queryFn: () => apiRequest<any>("GET", "/api/broadcasts"),              staleTime: 60_000 });
  const { data: recentLeads } = useQuery({
    queryKey: ["leads", { limit: 5 }],
    queryFn:  () => apiRequest<any>("GET", "/api/leads?limit=5&page=1"),
  });

  const stages    = funnel?.data?.stages ?? [];
  const totals    = funnel?.data?.totals;
  const trendData = trend?.data?.trend ?? [];
  const summary   = taskSum?.data;

  const conversionRate = totals
    ? Math.round((parseInt(totals["admitted"] ?? "0") / Math.max(parseInt(totals["total"] ?? "1"), 1)) * 100)
    : 0;

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  /* ── KPI data ─────────────────────────────────────────────── */
  const kpisOverview: KpiCardProps[] = [
    {
      label: "Total Leads",
      value: totals?.["total"] ?? "—",
      sub: "all time",
      icon: Users,
      trend: "up",
      accent:    "border-blue-500/30",
      iconBg:    "bg-blue-500/15",
      iconColor: "text-blue-400",
      gradFrom:  "from-blue-600/15",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: "new → admitted",
      icon: TrendingUp,
      trend: conversionRate >= 10 ? "up" : "down",
      accent:    "border-emerald-500/30",
      iconBg:    "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      gradFrom:  "from-emerald-600/12",
    },
    {
      label: "Tasks Due Today",
      value: summary?.["due_today"] ?? "—",
      sub: `${summary?.["overdue"] ?? 0} overdue`,
      icon: CheckSquare,
      trend: "neutral",
      accent:    "border-amber-500/30",
      iconBg:    "bg-amber-500/15",
      iconColor: "text-amber-400",
      gradFrom:  "from-amber-600/12",
    },
    {
      label: "Overdue Tasks",
      value: summary?.["overdue"] ?? "—",
      sub: "need attention",
      icon: AlertTriangle,
      trend: Number(summary?.["overdue"] ?? 0) > 0 ? "down" : "up",
      accent:    "border-rose-500/30",
      iconBg:    "bg-rose-500/15",
      iconColor: "text-rose-400",
      gradFrom:  "from-rose-600/12",
    },
  ];

  const kpisRevenue: KpiCardProps[] = [
    {
      label: "Collected Today",
      value: `₹${parseFloat(payStats?.data?.today ?? "0").toLocaleString("en-IN")}`,
      icon: IndianRupee,
      trend: "up",
      accent:    "border-teal-500/30",
      iconBg:    "bg-teal-500/15",
      iconColor: "text-teal-400",
      gradFrom:  "from-teal-600/12",
    },
    {
      label: "This Month",
      value: `₹${parseFloat(payStats?.data?.this_month ?? "0").toLocaleString("en-IN")}`,
      icon: CreditCard,
      trend: "up",
      accent:    "border-indigo-500/30",
      iconBg:    "bg-indigo-500/15",
      iconColor: "text-indigo-400",
      gradFrom:  "from-indigo-600/12",
    },
    {
      label: "Overdue Dues",
      value: duesData?.meta?.overdueCount ?? "—",
      sub: duesData?.meta?.overdueAmt
        ? `₹${parseFloat(duesData.meta.overdueAmt).toLocaleString("en-IN")}`
        : undefined,
      icon: AlertTriangle,
      trend: "down",
      accent:    "border-red-500/30",
      iconBg:    "bg-red-500/15",
      iconColor: "text-red-400",
      gradFrom:  "from-red-600/12",
    },
    {
      label: "Demos Today",
      value: (demosToday?.data ?? []).filter(
        (d: any) => new Date(d.scheduled_at).toDateString() === new Date().toDateString()
      ).length,
      icon: Video,
      trend: "neutral",
      accent:    "border-violet-500/30",
      iconBg:    "bg-violet-500/15",
      iconColor: "text-violet-400",
      gradFrom:  "from-violet-600/12",
    },
  ];

  const kpisEngagement: KpiCardProps[] = [
    {
      label: "NPS Score",
      value: npsStats?.data?.overall?.nps_score ?? "—",
      sub: `${npsStats?.data?.overall?.responses ?? 0} responses`,
      icon: Star,
      trend: "up",
      accent:    "border-yellow-500/30",
      iconBg:    "bg-yellow-500/15",
      iconColor: "text-yellow-400",
      gradFrom:  "from-yellow-600/12",
    },
    {
      label: "Active Broadcasts",
      value: (broadcasts?.data ?? []).filter((b: any) => b.status === "running").length,
      sub: `${(broadcasts?.data ?? []).filter((b: any) => b.status === "completed").length} completed`,
      icon: Radio,
      trend: "neutral",
      accent:    "border-sky-500/30",
      iconBg:    "bg-sky-500/15",
      iconColor: "text-sky-400",
      gradFrom:  "from-sky-600/12",
    },
    {
      label: "Upcoming Dues",
      value: duesData?.meta?.upcomingCount ?? "—",
      sub: duesData?.meta?.upcomingAmt
        ? `₹${parseFloat(duesData.meta.upcomingAmt).toLocaleString("en-IN")} this week`
        : undefined,
      icon: Clock,
      trend: "neutral",
      accent:    "border-orange-500/30",
      iconBg:    "bg-orange-500/15",
      iconColor: "text-orange-400",
      gradFrom:  "from-orange-600/12",
    },
    {
      label: "All-Time Revenue",
      value: `₹${parseFloat(payStats?.data?.all_time ?? "0").toLocaleString("en-IN")}`,
      icon: TrendingUp,
      trend: "up",
      accent:    "border-cyan-500/30",
      iconBg:    "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      gradFrom:  "from-cyan-600/12",
    },
  ];

  return (
    <AppShell title="Dashboard">

      {/* ── Welcome banner ─────────────────────────────────────── */}
      <Section delay={0}>
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#07112A] via-[#09152F] to-[#050D1C] p-6">
          {/* Background dot grid */}
          <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60" />
          {/* Decorative orbs */}
          <div className="anim-orb pointer-events-none absolute -right-8 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="anim-orb pointer-events-none absolute right-12 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-cyan-500/8 blur-2xl" style={{ animationDelay: "1.5s" }} />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-blue-400/70">
                <Sparkles className="h-3.5 w-3.5" />
                {getGreeting()}, {firstName}
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Here's your business overview
              </h2>
              <p className="mt-1 text-sm text-slate-400/80">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {[
                { label: "Total", value: totals?.["total"] ?? "—", color: "text-blue-400" },
                { label: "Admitted", value: totals?.["admitted"] ?? "—", color: "text-emerald-400" },
                { label: "Today", value: `₹${parseFloat(payStats?.data?.today ?? "0").toLocaleString("en-IN")}`, color: "text-teal-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-center backdrop-blur-sm">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                  <p className={`mt-0.5 text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Overview KPIs ──────────────────────────────────────── */}
      <Section delay={80}>
        <SectionHeading>Overview</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpisOverview.map((k, i) => (
            <KpiCard key={k.label} {...k} delay={i * 70} />
          ))}
        </div>
      </Section>

      {/* ── Revenue KPIs ───────────────────────────────────────── */}
      <Section delay={160}>
        <SectionHeading>Revenue</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpisRevenue.map((k, i) => (
            <KpiCard key={k.label} {...k} delay={i * 70} />
          ))}
        </div>
      </Section>

      {/* ── Engagement KPIs ────────────────────────────────────── */}
      <Section delay={240}>
        <SectionHeading>Engagement</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpisEngagement.map((k, i) => (
            <KpiCard key={k.label} {...k} delay={i * 70} />
          ))}
        </div>
      </Section>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <Section delay={320}>
        <SectionHeading>Analytics</SectionHeading>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Lead Funnel */}
          <Card className="anim-slide-left lg:col-span-1 border-slate-200 bg-white" style={{ animationDelay: "60ms" } as any}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Lead Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {stages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stages} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#607D8B" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#607D8B" }}
                      tickFormatter={(s) => STAGE_LABELS[s] ?? s} width={78} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Leads"]} />
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
          <Card className="anim-fade-up lg:col-span-2 border-slate-200 bg-white" style={{ animationDelay: "120ms" } as any}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">7-Day Lead Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#607D8B" }}
                    tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#607D8B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#546E7A" }} />
                  <Line type="monotone" dataKey="leads_created" stroke="#1976D2" name="New Leads"
                    strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#1976D2" }} />
                  <Line type="monotone" dataKey="admitted" stroke="#2E7D32" name="Admitted"
                    strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#2E7D32" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ── Stage Distribution + Recent Leads ──────────────────── */}
      <Section delay={400}>
        <SectionHeading>Details</SectionHeading>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Stage Pie */}
          <Card className="anim-slide-left border-slate-200 bg-white" style={{ animationDelay: "60ms" } as any}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Leads by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              {stages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stages.filter((s: any) => parseInt(s.count) > 0)}
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={82}
                      dataKey="count" nameKey="stage"
                      label={({ stage, pct }) => `${STAGE_LABELS[stage] ?? stage} ${pct}%`}
                      labelLine={false}
                    >
                      {stages.filter((s: any) => parseInt(s.count) > 0).map((s: any, i: number) => (
                        <Cell key={s.stage} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, name: string) => [v, STAGE_LABELS[name] ?? name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="anim-slide-right lg:col-span-2 border-slate-200 bg-white" style={{ animationDelay: "120ms" } as any}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Lead</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Stage</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Assigned</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentLeads?.data ?? []).map((l: any, i: number) => (
                    <tr
                      key={l.id}
                      className="anim-fade-up border-b border-border/40 transition-colors hover:bg-slate-50"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {l.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{l.full_name}</p>
                            <p className="text-[10px] text-muted-foreground/60">{l.lead_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${STAGE_COLORS[l.stage]}`}>
                          {STAGE_LABELS[l.stage] ?? l.stage}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground/80">
                        {l.assigned_to_name ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[11px] text-muted-foreground/60">
                        {formatDateTime(l.created_at)}
                      </td>
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
      </Section>

    </AppShell>
  );
}
