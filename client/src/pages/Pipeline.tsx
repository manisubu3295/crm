import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CreditCard, MessageSquare, Clock, AlertTriangle,
  Phone, ChevronRight, Zap, RefreshCw, User, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { apiRequest } from "../lib/queryClient.js";

type Tab = "payment" | "interested" | "stale" | "overdue";

function hrs(n: number | string) {
  const h = Math.round(Number(n));
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function UrgencyBadge({ hours }: { hours: number }) {
  if (hours > 72) return <Badge variant="destructive" className="text-[10px]">{hrs(hours)} overdue</Badge>;
  if (hours > 24) return <Badge variant="warning" className="text-[10px]">{hrs(hours)}</Badge>;
  return <Badge variant="secondary" className="text-[10px]">{hrs(hours)}</Badge>;
}

function LeadRow({ lead, extra, href }: { lead: any; extra?: React.ReactNode; href: string }) {
  return (
    <div className="group flex items-start justify-between gap-3 border-b px-5 py-3.5 last:border-0 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
          {lead.full_name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[13px] text-foreground truncate">{lead.full_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3" />{lead.phone}
            </span>
            {lead.course_name && (
              <span className="text-[11px] text-indigo-600 font-medium">{lead.course_name}</span>
            )}
            {lead.counsellor_name && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User className="h-3 w-3" />{lead.counsellor_name}
              </span>
            )}
          </div>
          {extra && <div className="mt-1">{extra}</div>}
        </div>
      </div>
      <Link href={href}>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-indigo-600 hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </Link>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="py-14 text-center">
      <Icon className="mx-auto h-10 w-10 text-muted-foreground/25 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "payment",    label: "Payment Pending",    icon: CreditCard,    color: "text-amber-600" },
  { id: "interested", label: "Interested – No Response", icon: MessageSquare, color: "text-blue-600" },
  { id: "stale",      label: "Stale Pipeline",     icon: Clock,         color: "text-slate-600" },
  { id: "overdue",    label: "Overdue Tasks",       icon: AlertTriangle, color: "text-red-600" },
];

export function PipelinePage() {
  const [tab, setTab] = useState<Tab>("payment");
  const qc = useQueryClient();

  const { data: insights } = useQuery({
    queryKey: ["pipeline-insights"],
    queryFn: () => apiRequest<any>("GET", "/api/pipeline/insights"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const counts: Record<Tab, number> = {
    payment:    insights?.data?.paymentPending ?? 0,
    interested: insights?.data?.interestedCold ?? 0,
    stale:      insights?.data?.stalePipeline ?? 0,
    overdue:    insights?.data?.overdueFollowups ?? 0,
  };

  const { data: paymentData, isLoading: loadingPayment } = useQuery({
    queryKey: ["pipeline-payment"],
    queryFn: () => apiRequest<any>("GET", "/api/pipeline/payment-pending"),
    enabled: tab === "payment",
    staleTime: 30_000,
  });

  const { data: interestedData, isLoading: loadingInterested } = useQuery({
    queryKey: ["pipeline-interested"],
    queryFn: () => apiRequest<any>("GET", "/api/pipeline/interested-cold"),
    enabled: tab === "interested",
    staleTime: 30_000,
  });

  const { data: staleData, isLoading: loadingStale } = useQuery({
    queryKey: ["pipeline-stale"],
    queryFn: () => apiRequest<any>("GET", "/api/pipeline/stale"),
    enabled: tab === "stale",
    staleTime: 30_000,
  });

  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ["pipeline-overdue"],
    queryFn: () => apiRequest<any>("GET", "/api/pipeline/overdue-tasks"),
    enabled: tab === "overdue",
    staleTime: 30_000,
  });

  // Quick action: move to next stage
  const moveStage = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: string }) =>
      apiRequest("PATCH", `/api/leads/${leadId}/stage`, { stage, note: "Pipeline action" }),
    onSuccess: () => {
      toast.success("Stage updated");
      qc.invalidateQueries({ queryKey: ["pipeline-payment"] });
      qc.invalidateQueries({ queryKey: ["pipeline-interested"] });
      qc.invalidateQueries({ queryKey: ["pipeline-insights"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Quick action: trigger automation
  const triggerAutomation = useMutation({
    mutationFn: ({ leadId, event }: { leadId: string; event: string }) =>
      apiRequest("POST", "/api/automation/trigger", { leadId, event }),
    onSuccess: () => toast.success("Automation triggered"),
    onError: () => {}, // silently ignore — feature may not exist yet
  });

  const isLoading = (tab === "payment" && loadingPayment) || (tab === "interested" && loadingInterested) ||
                    (tab === "stale" && loadingStale) || (tab === "overdue" && loadingOverdue);

  const currentRows: any[] = tab === "payment" ? (paymentData?.data ?? [])
    : tab === "interested" ? (interestedData?.data ?? [])
    : tab === "stale"      ? (staleData?.data ?? [])
    : (overdueData?.data ?? []);

  return (
    <AppShell title="Pipeline Insights">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl border p-4 text-left transition-all ${tab === id ? "border-indigo-300 bg-indigo-50 shadow-sm" : "border-border bg-card hover:bg-muted/40"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              {counts[id] > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${id === "payment" ? "bg-amber-100 text-amber-700" : id === "overdue" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                  {counts[id]}
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-foreground">{counts[id]}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{label}</p>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-0 pt-0 px-0">
          <div className="flex overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {counts[id] > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === id ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"}`}>
                    {counts[id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}

          {!isLoading && currentRows.length === 0 && (
            tab === "payment" ? <EmptyState icon={CreditCard} title="No payment-pending leads" sub="All payment-stage leads have been converted or moved" /> :
            tab === "interested" ? <EmptyState icon={MessageSquare} title="All interested leads are engaged" sub="No leads waiting for a response beyond 24h" /> :
            tab === "stale" ? <EmptyState icon={Clock} title="Pipeline is active" sub="No leads sitting idle for more than 7 days" /> :
            <EmptyState icon={CheckSquare} title="No overdue tasks" sub="All follow-up tasks are on time" />
          )}

          {/* Payment Pending */}
          {tab === "payment" && currentRows.map((lead: any) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              href={`/leads/${lead.id}`}
              extra={
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <UrgencyBadge hours={Number(lead.hours_in_stage)} />
                  {lead.last_channel && (
                    <span className="text-[10px] text-muted-foreground">Last: {lead.last_channel}</span>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => moveStage.mutate({ leadId: lead.id, stage: "admitted" })}
                    >
                      Mark Admitted
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => toast.info("Use Follow-Ups page to send payment reminder")}
                    >
                      <Phone className="h-3 w-3 mr-1" /> Remind
                    </Button>
                  </div>
                </div>
              }
            />
          ))}

          {/* Interested – No Response */}
          {tab === "interested" && currentRows.map((lead: any) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              href={`/leads/${lead.id}`}
              extra={
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <UrgencyBadge hours={Number(lead.hours_no_response)} />
                  {Number(lead.reply_count) > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium">{lead.reply_count} replies received</span>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => moveStage.mutate({ leadId: lead.id, stage: "demo" })}
                    >
                      Move → Demo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px] border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => triggerAutomation.mutate({ leadId: lead.id, event: "no_response_24h" })}
                    >
                      <Zap className="h-3 w-3 mr-1" /> Follow-up
                    </Button>
                  </div>
                </div>
              }
            />
          ))}

          {/* Stale Pipeline */}
          {tab === "stale" && currentRows.map((lead: any) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              href={`/leads/${lead.id}`}
              extra={
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] capitalize">{lead.stage}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Idle {Math.round(Number(lead.days_stale))}d
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] ml-auto"
                    onClick={() => triggerAutomation.mutate({ leadId: lead.id, event: "no_response_48h" })}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Re-engage
                  </Button>
                </div>
              }
            />
          ))}

          {/* Overdue Tasks */}
          {tab === "overdue" && currentRows.map((task: any) => (
            <div key={task.id} className="group flex items-start justify-between gap-3 border-b px-5 py-3.5 last:border-0 hover:bg-muted/20 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <p className="font-semibold text-[13px] text-foreground">{task.title}</p>
                  <UrgencyBadge hours={Number(task.hours_overdue)} />
                  <Badge variant="secondary" className="text-[10px] capitalize">{task.task_type}</Badge>
                  <Badge
                    variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "warning" : "secondary"}
                    className="text-[10px] capitalize"
                  >{task.priority}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/leads/${task.lead_id}`}>
                    <span className="text-[11px] text-indigo-600 hover:underline cursor-pointer">{task.lead_name}</span>
                  </Link>
                  <span className="text-[11px] text-muted-foreground">{task.lead_stage} · {task.lead_phone}</span>
                  {task.assigned_to_name && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" />{task.assigned_to_name}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/leads/${task.lead_id}`}>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-indigo-600 hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ChevronRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
