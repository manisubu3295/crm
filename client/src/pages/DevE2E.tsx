import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Circle, Loader2, ChevronRight, Terminal,
  Users, Zap, MessageSquare, PhoneCall, Mail, Phone,
  ArrowRight, RefreshCw, BarChart2, AlertTriangle, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { getAuthHeaders } from "../lib/queryClient.js";

// ─── Types ────────────────────────────────────────────────────

type StepState = "idle" | "running" | "done" | "error";

interface StepResult {
  state: StepState;
  data?: any;
  error?: string;
  duration?: number;
}

type Steps = Record<string, StepResult>;

// ─── Dev API helper ───────────────────────────────────────────

async function devCall(path: string, body?: object) {
  const t0 = Date.now();
  const res = await fetch(path, {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok || !data.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
  return { data, duration: Date.now() - t0 };
}

// ─── Channel icons ────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Phone,
  ivr: PhoneCall,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-600 bg-green-50",
  email:    "text-blue-600 bg-blue-50",
  sms:      "text-purple-600 bg-purple-50",
  ivr:      "text-orange-600 bg-orange-50",
};

// ─── Main Page ────────────────────────────────────────────────

export function DevE2EPage() {
  const qc = useQueryClient();
  const [steps, setSteps] = useState<Steps>({});
  const [leadId, setLeadId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Status query (channel config, templates, rules)
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["dev-status"],
    queryFn: async () => {
      const { data } = await devCall("/api/dev/status");
      return data;
    },
    retry: false,
  });

  // Lead timeline (re-fetched after each step)
  const { data: timeline, refetch: refetchTimeline } = useQuery({
    queryKey: ["dev-timeline", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data } = await devCall(`/api/dev/lead-timeline/${leadId}`);
      return data;
    },
    enabled: !!leadId,
    refetchInterval: 3000,
  });

  const setStep = useCallback((key: string, result: StepResult) => {
    setSteps(prev => ({ ...prev, [key]: result }));
  }, []);

  const run = useCallback(async (key: string, fn: () => Promise<any>) => {
    setStep(key, { state: "running" });
    try {
      const result = await fn();
      setStep(key, { state: "done", data: result.data, duration: result.duration });
      return result.data;
    } catch (e: any) {
      setStep(key, { state: "error", error: e.message });
      toast.error(`${key}: ${e.message}`);
      throw e;
    }
  }, [setStep]);

  // ── Step runners ─────────────────────────────────────────────

  const runSeedData = () => run("seed", async () => {
    const r = await devCall("/api/dev/seed-test-data", {});
    toast.success("Test data seeded");
    await refetchStatus();
    return r;
  });

  const runCreateLead = () => run("createLead", async () => {
    const r = await devCall("/api/dev/create-lead", {
      fullName: `Test Student ${Date.now().toString().slice(-4)}`,
      phone:    "9" + Math.floor(100000000 + Math.random() * 900000000).toString(),
      email:    `test.${Date.now()}@example.com`,
      source:   "website",
    });
    setLeadId(r.data.lead.id);
    toast.success(`Lead created: ${r.data.lead.lead_no ?? r.data.lead.id}`);
    qc.invalidateQueries({ queryKey: ["leads"] });
    return r;
  });

  const runTriggerNewLead = () => run("triggerNewLead", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/trigger-event", { leadId, event: "lead_created" });
    toast.success("lead_created automation fired");
    return r;
  });

  const runSendWhatsApp = () => run("sendWhatsApp", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const template = status?.templates?.find((t: any) => t.channel === "whatsapp");
    if (!template) throw new Error("No WhatsApp template found — run Seed Data first");
    const r = await devCall("/api/dev/send-channel", { leadId, channel: "whatsapp", templateId: template.id });
    toast.success("WhatsApp message queued");
    return r;
  });

  const runSendEmail = () => run("sendEmail", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const template = status?.templates?.find((t: any) => t.channel === "email");
    if (!template) throw new Error("No Email template found — run Seed Data first");
    const r = await devCall("/api/dev/send-channel", { leadId, channel: "email", templateId: template.id });
    toast.success("Email queued");
    return r;
  });

  const runSendSMS = () => run("sendSMS", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const template = status?.templates?.find((t: any) => t.channel === "sms");
    if (!template) throw new Error("No SMS template found — run Seed Data first");
    const r = await devCall("/api/dev/send-channel", { leadId, channel: "sms", templateId: template.id });
    toast.success("SMS queued");
    return r;
  });

  const runSendIVR = () => run("sendIVR", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/send-channel", { leadId, channel: "ivr", body: "default" });
    toast.success("IVR call queued");
    return r;
  });

  const runSimulateReply = () => run("simulateReply", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/simulate-whatsapp-reply", {
      leadId,
      replyText: "YES I am interested in joining the course",
    });
    toast.success("WhatsApp reply simulated → lead moved to Interested");
    qc.invalidateQueries({ queryKey: ["leads"] });
    return r;
  });

  const runTriggerNoResponse = () => run("triggerNoResponse", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/trigger-event", { leadId, event: "no_response_24h" });
    toast.success("no_response_24h automation fired");
    return r;
  });

  const runConvertLead = () => run("convertLead", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/convert-lead", { leadId, finalStage: "admitted" });
    toast.success("Lead converted to Admitted!");
    qc.invalidateQueries({ queryKey: ["leads"] });
    return r;
  });

  const runTriggerSLABreach = () => run("triggerSLA", async () => {
    if (!leadId) throw new Error("Create a lead first");
    const r = await devCall("/api/dev/trigger-event", { leadId, event: "sla_breach" });
    toast.success("sla_breach automation fired");
    return r;
  });

  // ── Layout ────────────────────────────────────────────────────

  return (
    <AppShell title="E2E Test Lab">
      {/* Banner */}
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
        <Terminal className="h-4 w-4 shrink-0" />
        <span><strong>Development only</strong> — all actions use real DB + real queues. Not available in production.</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: step-by-step runner */}
        <div className="space-y-4 lg:col-span-2">

          {/* 0. Channel status */}
          <Section title="0. Channel Configuration" icon={<Zap className="h-4 w-4" />} id="channels" active={activeSection} setActive={setActiveSection}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(status?.channels ?? {}).map(([ch, ok]) => {
                const Icon = CHANNEL_ICONS[ch] ?? MessageSquare;
                return (
                  <div key={ch} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${ok ? "border-emerald-200 bg-emerald-50" : "border-border bg-muted/40"}`}>
                    <Icon className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-semibold capitalize text-foreground">{ch}</p>
                      <p className={`text-[10px] font-medium ${ok ? "text-emerald-600" : "text-red-500"}`}>{ok ? "Configured" : "Not set"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Channels marked "Not set" — messages will be queued but dispatch will fail gracefully. Configure keys in <code>.env</code> to send real messages.
            </p>
          </Section>

          {/* 1. Seed test data */}
          <Section title="1. Seed Test Data" icon={<RefreshCw className="h-4 w-4" />} id="seed" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Creates message templates for all 4 channels and 4 automation rules (new lead, no-response 24h/48h, stage change). Safe to run multiple times.
            </p>
            <StepButton label="Seed templates + rules + test campaign" step={steps["seed"]} onClick={runSeedData} />
            {steps["seed"]?.state === "done" && (
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <StatBox label="Templates" value={steps["seed"].data?.insertedTemplates?.length ?? 0} />
                <StatBox label="Rules" value={steps["seed"].data?.insertedRules?.length ?? 0} />
                <StatBox label="Campaign" value={steps["seed"].data?.campaign ? "✓" : "—"} />
              </div>
            )}
          </Section>

          {/* 2. Create lead */}
          <Section title="2. Create Lead (Manual)" icon={<Users className="h-4 w-4" />} id="createLead" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Creates a test student lead with auto-generated phone/email. The lead is linked to the E2E test campaign.
            </p>
            <StepButton label="Create test lead" step={steps["createLead"]} onClick={runCreateLead} />
            {leadId && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border bg-indigo-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-700">Lead ID: {leadId}</span>
                <Link href={`/leads/${leadId}`} className="ml-auto">
                  <span className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">
                    View <LinkIcon className="h-3 w-3" />
                  </span>
                </Link>
              </div>
            )}
          </Section>

          {/* 3. Automation — new lead event */}
          <Section title="3. Trigger Automation — Lead Created" icon={<Zap className="h-4 w-4" />} id="autoNewLead" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Fires the <code>lead_created</code> trigger. The E2E rule will enqueue: WhatsApp welcome, Email welcome, and a call task.
            </p>
            <StepButton label="Fire lead_created event" step={steps["triggerNewLead"]} onClick={runTriggerNewLead} disabled={!leadId} />
          </Section>

          {/* 4. Send messages per channel */}
          <Section title="4. Send Messages — All Channels" icon={<MessageSquare className="h-4 w-4" />} id="channels2" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Directly queues a message on each channel for the test lead. This bypasses automation and tests the dispatch pipeline directly.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "sendWhatsApp", label: "WhatsApp",  ch: "whatsapp", fn: runSendWhatsApp },
                { key: "sendEmail",    label: "Email",     ch: "email",    fn: runSendEmail },
                { key: "sendSMS",      label: "SMS",       ch: "sms",      fn: runSendSMS },
                { key: "sendIVR",      label: "IVR Call",  ch: "ivr",      fn: runSendIVR },
              ].map(({ key, label, ch, fn }) => {
                const Icon = CHANNEL_ICONS[ch];
                return (
                  <StepButton
                    key={key}
                    label={label}
                    icon={<Icon className="h-3.5 w-3.5" />}
                    step={steps[key]}
                    onClick={fn}
                    disabled={!leadId}
                    colorClass={CHANNEL_COLORS[ch]}
                  />
                );
              })}
            </div>
          </Section>

          {/* 5. Simulate WhatsApp reply */}
          <Section title="5. Student Replies via WhatsApp" icon={<MessageSquare className="h-4 w-4 text-green-600" />} id="waReply" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Simulates an inbound WhatsApp message from the student: <em>"YES I am interested in joining the course"</em>. This logs an inbound comm, moves the lead to <strong>Interested</strong>, and fires the <code>lead_stage_changed</code> automation trigger.
            </p>
            <StepButton label="Simulate: Student replies YES on WhatsApp" step={steps["simulateReply"]} onClick={runSimulateReply} disabled={!leadId} />
            {steps["simulateReply"]?.state === "done" && (
              <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                <strong>Reply logged.</strong> Lead stage → Interested. Automation triggered.
              </div>
            )}
          </Section>

          {/* 6. No-response follow-up */}
          <Section title="6. Trigger No-Response Follow-up" icon={<AlertTriangle className="h-4 w-4" />} id="noResponse" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Fires <code>no_response_24h</code>. The E2E rule sends a WhatsApp follow-up. Also fires <code>sla_breach</code> to test SLA escalation.
            </p>
            <div className="flex gap-2">
              <StepButton label="Fire no_response_24h" step={steps["triggerNoResponse"]} onClick={runTriggerNoResponse} disabled={!leadId} />
              <StepButton label="Fire sla_breach" step={steps["triggerSLA"]} onClick={runTriggerSLABreach} disabled={!leadId} />
            </div>
          </Section>

          {/* 7. Convert lead */}
          <Section title="7. Convert Lead to Admitted" icon={<ArrowRight className="h-4 w-4" />} id="convert" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Walks the lead through all stages: contacted → qualified → demo → interested → payment → <strong>admitted</strong>. Fires <code>lead_stage_changed</code> at each step.
            </p>
            <StepButton label="Convert → Admitted (full journey)" step={steps["convertLead"]} onClick={runConvertLead} disabled={!leadId} />
            {steps["convertLead"]?.state === "done" && (
              <div className="mt-2 flex flex-wrap gap-1">
                {steps["convertLead"].data?.stagesTraversed?.map((s: string) => (
                  <Badge key={s} variant="success" className="text-[10px]">{s}</Badge>
                ))}
              </div>
            )}
          </Section>

          {/* 8. Reports */}
          <Section title="8. Verify Reports" icon={<BarChart2 className="h-4 w-4" />} id="reports" active={activeSection} setActive={setActiveSection}>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Navigate to the Reports page to verify funnel counts, counsellor performance, and campaign ROI reflect the test lead.
            </p>
            <div className="flex gap-2">
              <Link href="/reports">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" /> Open Reports
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Campaigns
                </Button>
              </Link>
              <Link href="/followups">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Follow-ups
                </Button>
              </Link>
            </div>
          </Section>
        </div>

        {/* RIGHT: live timeline panel */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm sticky top-20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Live Lead Timeline</CardTitle>
                {leadId && (
                  <button onClick={() => refetchTimeline()} className="rounded p-1 hover:bg-muted transition-colors">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!leadId && (
                <p className="py-10 text-center text-xs text-muted-foreground">Create a lead to see timeline</p>
              )}

              {timeline && (
                <>
                  {/* Lead summary */}
                  <div className="border-b px-4 py-3">
                    <p className="font-semibold text-[13px] text-foreground">{timeline.lead?.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{timeline.lead?.lead_no} · {timeline.lead?.phone}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="indigo" className="text-[10px]">Stage: {timeline.lead?.stage}</Badge>
                      {timeline.lead?.assigned_to_name && (
                        <Badge variant="default" className="text-[10px]">{timeline.lead.assigned_to_name}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 border-b">
                    {[
                      { label: "Stages", value: timeline.summary?.totalStageChanges },
                      { label: "Messages", value: timeline.summary?.totalMessages },
                      { label: "Tasks", value: timeline.summary?.totalTasks },
                      { label: "Rules run", value: timeline.summary?.automationsFired },
                    ].map(s => (
                      <div key={s.label} className="border-r last:border-r-0 py-2 text-center">
                        <p className="text-[15px] font-bold text-foreground">{s.value ?? 0}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Channel usage */}
                  {timeline.summary?.channelsUsed?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-b px-4 py-2">
                      {timeline.summary.channelsUsed.map((ch: string) => {
                        const Icon = CHANNEL_ICONS[ch] ?? MessageSquare;
                        return (
                          <span key={ch} className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_COLORS[ch] ?? "bg-muted text-muted-foreground"}`}>
                            <Icon className="h-3 w-3" />{ch}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Events feed */}
                  <div className="max-h-[460px] overflow-y-auto">
                    {buildTimelineEvents(timeline).map((ev, i) => (
                      <TimelineEvent key={i} event={ev} />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Step progress */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Step Progress</CardTitle></CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {[
                ["seed",            "Seed test data"],
                ["createLead",      "Create lead"],
                ["triggerNewLead",  "Fire lead_created"],
                ["sendWhatsApp",    "Send WhatsApp"],
                ["sendEmail",       "Send Email"],
                ["sendSMS",         "Send SMS"],
                ["sendIVR",         "Send IVR"],
                ["simulateReply",   "WA reply received"],
                ["triggerNoResponse", "No-response trigger"],
                ["triggerSLA",      "SLA breach trigger"],
                ["convertLead",     "Convert to Admitted"],
              ].map(([key, label]) => {
                const s = steps[key as string];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <StepIcon state={s?.state ?? "idle"} />
                    <span className={`text-[12px] ${s?.state === "done" ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                    {s?.duration && <span className="ml-auto text-[10px] text-muted-foreground">{s.duration}ms</span>}
                    {s?.state === "error" && <span className="ml-auto text-[10px] text-red-500 truncate max-w-[80px]" title={s.error}>{s.error}</span>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Timeline builder ──────────────────────────────────────────

type TimelineItem = { type: "stage" | "comm" | "task" | "automation"; label: string; sub: string; ts: string; icon: React.ElementType; color: string };

function buildTimelineEvents(timeline: any): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const s of timeline.timeline.stageHistory ?? []) {
    items.push({ type: "stage", label: `Stage → ${s.to_stage}`, sub: s.note ?? "", ts: s.changed_at, icon: ArrowRight, color: "text-indigo-600 bg-indigo-50" });
  }
  for (const c of timeline.timeline.communications ?? []) {
    const Icon = CHANNEL_ICONS[c.channel] ?? MessageSquare;
    items.push({ type: "comm", label: `${c.channel} ${c.direction}`, sub: (c.body ?? "").slice(0, 60), ts: c.created_at, icon: Icon, color: CHANNEL_COLORS[c.channel] ?? "text-slate-600 bg-slate-50" });
  }
  for (const t of timeline.timeline.tasks ?? []) {
    items.push({ type: "task", label: t.title, sub: `${t.task_type} · ${t.status} · ${t.priority}`, ts: t.created_at, icon: CheckCircle2, color: "text-amber-600 bg-amber-50" });
  }
  for (const a of timeline.timeline.automationRuns ?? []) {
    items.push({ type: "automation", label: `Rule: ${a.rule_name}`, sub: a.status, ts: a.triggered_at, icon: Zap, color: a.status === "success" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" });
  }

  return items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

function TimelineEvent({ event }: { event: TimelineItem }) {
  const Icon = event.icon;
  return (
    <div className="flex gap-2.5 border-b px-4 py-2.5 last:border-0">
      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${event.color}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-foreground truncate">{event.label}</p>
        {event.sub && <p className="text-[10px] text-muted-foreground truncate">{event.sub}</p>}
        <p className="text-[10px] text-muted-foreground/60">{new Date(event.ts).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function Section({ title, icon, id, active, setActive, children }: {
  title: string; icon: React.ReactNode; id: string;
  active: string | null; setActive: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = active === id || active === null;
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <button
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setActive(active === id ? "" : id)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{icon}</span>
        <span className="flex-1 text-[13px] font-semibold text-foreground">{title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
      {isOpen && (
        <div className="border-t px-4 py-4">{children}</div>
      )}
    </Card>
  );
}

function StepButton({ label, step, onClick, disabled, icon, colorClass }: {
  label: string; step?: StepResult; onClick: () => void;
  disabled?: boolean; icon?: React.ReactNode; colorClass?: string;
}) {
  const running = step?.state === "running";
  const done    = step?.state === "done";
  const error   = step?.state === "error";

  return (
    <button
      onClick={onClick}
      disabled={disabled || running}
      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${done  ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
          error ? "border-red-200 bg-red-50 text-red-700" :
          colorClass ? `border-current ${colorClass}` :
          "border-border bg-background text-foreground hover:bg-muted"}`}
    >
      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
       done    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
       error   ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> :
       icon    ? icon :
       <Circle className="h-3.5 w-3.5 opacity-30" />}
      {label}
    </button>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />;
  if (state === "done")    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (state === "error")   return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />;
}

function StatBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
