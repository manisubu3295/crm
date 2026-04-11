import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Zap, Play, Pause, Trash2, ChevronDown, ChevronUp,
  MessageSquare, CheckSquare, ArrowRight, Users, X, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Input } from "../components/ui/input.js";
import { apiRequest } from "../lib/queryClient.js";
import { timeAgo, STAGE_LABELS } from "../lib/utils.js";

// ─── Constants ────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  lead_created:           "New lead created",
  lead_stage_changed:     "Lead stage changed",
  lead_assigned:          "Lead assigned",
  no_response_24h:        "No response for 24 hours",
  no_response_48h:        "No response for 48 hours",
  demo_scheduled:         "Demo scheduled",
  demo_completed:         "Demo completed",
  payment_link_sent:      "Payment link sent",
  payment_pending_24h:    "Payment pending 24 hours",
  task_overdue:           "Task overdue",
  sla_breach:             "SLA breach",
  lead_re_entered_pipeline: "Lead re-entered pipeline",
};

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp",  color: "text-green-600",  bg: "bg-green-50" },
  { value: "email",    label: "Email",     color: "text-blue-600",   bg: "bg-blue-50" },
  { value: "sms",      label: "SMS",       color: "text-purple-600", bg: "bg-purple-50" },
  { value: "ivr",      label: "IVR Call",  color: "text-orange-600", bg: "bg-orange-50" },
];

const ACTION_TYPES = [
  { value: "send_message",  label: "Send Message",   icon: MessageSquare },
  { value: "assign_task",   label: "Assign Task",    icon: CheckSquare },
  { value: "change_stage",  label: "Change Stage",   icon: ArrowRight },
  { value: "escalate",      label: "Escalate",       icon: Users },
];

const TASK_TYPES = ["call", "follow_up", "demo", "email", "whatsapp", "meeting", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STAGES = Object.entries(STAGE_LABELS).map(([v, l]) => ({ value: v, label: l }));

// ─── Types ────────────────────────────────────────────────────

type ActionStep = {
  id: string;
  type: "send_message" | "assign_task" | "change_stage" | "escalate";
  // send_message
  channel?: string;
  templateId?: string;
  // assign_task
  taskType?: string;
  title?: string;
  dueHours?: number;
  priority?: string;
  // change_stage
  toStage?: string;
  // escalate
  toUserId?: string;
  message?: string;
};

function makeAction(): ActionStep {
  return { id: crypto.randomUUID(), type: "assign_task", taskType: "call", title: "", dueHours: 24, priority: "high" };
}

// ─── Main Page ────────────────────────────────────────────────

export function AutomationPage() {
  const [showNew, setShowNew]   = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const qc = useQueryClient();

  const { data: rules }     = useQuery({ queryKey: ["automation-rules"],    queryFn: () => apiRequest<any>("GET", "/api/automation/rules") });
  const { data: logs }      = useQuery({ queryKey: ["automation-logs"],     queryFn: () => apiRequest<any>("GET", "/api/automation/logs") });
  const { data: templates } = useQuery({ queryKey: ["comms-templates"],     queryFn: () => apiRequest<any>("GET", "/api/comms/templates") });
  const { data: users }     = useQuery({ queryKey: ["admin-users"],         queryFn: () => apiRequest<any>("GET", "/api/admin/users") });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/automation/rules/${id}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); toast.success("Rule updated"); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/automation/rules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); toast.success("Rule removed"); },
  });

  const ruleList = rules?.data ?? [];
  const logList  = logs?.data  ?? [];
  const tmplList = templates?.data ?? [];
  const userList = users?.data ?? [];

  return (
    <AppShell title="Automation Engine">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ruleList.filter((r: any) => r.is_active).length} active of {ruleList.length} rules
        </p>
        <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4" /> New Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rules */}
        <div className="space-y-3 lg:col-span-2">
          {ruleList.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <Zap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No automation rules yet</p>
                <p className="mt-1 text-sm text-muted-foreground/70">Create your first rule to automate follow-ups</p>
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" size="sm" onClick={() => setShowNew(true)}>
                  <Plus className="h-3.5 w-3.5" /> New Rule
                </Button>
              </CardContent>
            </Card>
          )}

          {ruleList.map((rule: any) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              tmplList={tmplList}
              onToggle={() => toggle.mutate({ id: rule.id, isActive: !rule.is_active })}
              onDelete={() => remove.mutate(rule.id)}
              onEdit={() => setEditRule(rule)}
            />
          ))}
        </div>

        {/* Execution log */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">Recent Executions</CardTitle></CardHeader>
            <CardContent className="p-0">
              {logList.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">No executions yet</p>
              )}
              {logList.slice(0, 30).map((log: any) => (
                <div key={log.id} className="flex items-start gap-2.5 border-b px-4 py-2.5 last:border-0">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    log.status === "success" ? "bg-emerald-500" : log.status === "failed" ? "bg-red-500" : "bg-slate-300"
                  }`} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{log.rule_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{log.lead_name}</p>
                    <p className="text-[10px] text-muted-foreground/60">{timeAgo(log.triggered_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <RuleBuilderDialog
        open={showNew || !!editRule}
        editData={editRule}
        tmplList={tmplList}
        userList={userList}
        onClose={() => { setShowNew(false); setEditRule(null); }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["automation-rules"] })}
      />
    </AppShell>
  );
}

// ─── Rule Card ────────────────────────────────────────────────

function RuleCard({ rule, tmplList, onToggle, onDelete, onEdit }: {
  rule: any; tmplList: any[];
  onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const actions: ActionStep[] = rule.actions ?? [];

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-start gap-3 p-4">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${rule.is_active ? "bg-indigo-50" : "bg-muted"}`}>
            <Zap className={`h-4 w-4 ${rule.is_active ? "text-indigo-600" : "text-muted-foreground"}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[13px] text-foreground">{rule.name}</p>
              <Badge variant={rule.is_active ? "indigo" : "default"} className="text-[10px]">
                {rule.is_active ? "Active" : "Paused"}
              </Badge>
              {rule.delay_minutes > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  Delay {rule.delay_minutes}m
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {TRIGGER_LABELS[rule.trigger_event] ?? rule.trigger_event}
              </span>
              <span className="text-[10px] text-muted-foreground">→ {actions.length} action{actions.length !== 1 ? "s" : ""}</span>
              <span className="text-[10px] text-muted-foreground">· Ran {rule.execution_count}×</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button onClick={onEdit} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-[11px] font-medium text-indigo-600">
              Edit
            </button>
            <button onClick={onToggle} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title={rule.is_active ? "Pause" : "Activate"}>
              {rule.is_active
                ? <Pause className="h-4 w-4 text-amber-500" />
                : <Play  className="h-4 w-4 text-emerald-500" />}
            </button>
            <button onClick={onDelete} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Expanded action steps */}
        {expanded && (
          <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
            {actions.map((a, i) => (
              <ActionBadge key={i} action={a} tmplList={tmplList} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action, tmplList }: { action: ActionStep; tmplList: any[] }) {
  const channel = CHANNELS.find(c => c.value === action.channel);
  const tmpl    = tmplList.find((t: any) => t.id === action.templateId);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
      <span className="font-semibold text-foreground capitalize">{action.type.replace(/_/g, " ")}</span>
      {action.type === "send_message" && channel && (
        <span className={`font-medium ${channel.color}`}>via {channel.label}</span>
      )}
      {action.type === "send_message" && tmpl && (
        <span className="text-muted-foreground truncate max-w-[200px]">"{tmpl.name}"</span>
      )}
      {action.type === "assign_task" && (
        <span className="text-muted-foreground">{action.title} · due in {action.dueHours}h · {action.priority}</span>
      )}
      {action.type === "change_stage" && (
        <span className="text-muted-foreground">→ {STAGE_LABELS[action.toStage ?? ""] ?? action.toStage}</span>
      )}
      {action.type === "escalate" && (
        <span className="text-muted-foreground">{action.message ?? "Escalate to manager"}</span>
      )}
    </div>
  );
}

// ─── Rule Builder Dialog ──────────────────────────────────────

function RuleBuilderDialog({ open, editData, tmplList, userList, onClose, onSaved }: {
  open: boolean;
  editData: any;
  tmplList: any[];
  userList: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!editData;

  const [name, setName]           = useState(editData?.name ?? "");
  const [description, setDesc]    = useState(editData?.description ?? "");
  const [trigger, setTrigger]     = useState(editData?.trigger_event ?? "lead_created");
  const [delay, setDelay]         = useState<number>(editData?.delay_minutes ?? 0);
  const [actions, setActions]     = useState<ActionStep[]>(
    editData?.actions?.length ? editData.actions.map((a: any) => ({ id: crypto.randomUUID(), ...a })) : [makeAction()]
  );
  const [saving, setSaving]       = useState(false);

  // Reset when dialog reopens
  const handleOpen = (o: boolean) => { if (!o) onClose(); };

  const addAction = () => setActions(prev => [...prev, makeAction()]);
  const removeAction = (id: string) => setActions(prev => prev.filter(a => a.id !== id));
  const updateAction = (id: string, patch: Partial<ActionStep>) =>
    setActions(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const save = async () => {
    if (!name.trim()) { toast.error("Rule name is required"); return; }
    if (!actions.length) { toast.error("Add at least one action"); return; }

    // Validate send_message actions have channel + template or body
    for (const a of actions) {
      if (a.type === "send_message" && !a.channel) {
        toast.error("Select a channel for each Send Message action"); return;
      }
      if (a.type === "send_message" && !a.templateId) {
        toast.error("Select a template for each Send Message action"); return;
      }
      if (a.type === "assign_task" && !a.title?.trim()) {
        toast.error("Task title is required"); return;
      }
      if (a.type === "change_stage" && !a.toStage) {
        toast.error("Select a target stage"); return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerEvent: trigger,
      delayMinutes: delay,
      actions: actions.map(({ id: _id, ...rest }) => rest),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await apiRequest("PATCH", `/api/automation/rules/${editData.id}`, payload);
        toast.success("Rule updated");
      } else {
        await apiRequest("POST", "/api/automation/rules", payload);
        toast.success("Rule created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Templates filtered per channel
  const tmplsFor = (ch: string) => tmplList.filter((t: any) => t.channel === ch);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Automation Rule" : "New Automation Rule"}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {/* Name + description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Rule Name *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome message on new lead" />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Description</label>
              <Input value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
            </div>
          </div>

          {/* Trigger + delay */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">When this happens (Trigger)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Event *</label>
                <select
                  value={trigger} onChange={e => setTrigger(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Execute after (minutes)</label>
                <Input
                  type="number" min={0} step={5} value={delay}
                  onChange={e => setDelay(parseInt(e.target.value, 10) || 0)}
                  placeholder="0 = immediately"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Do these actions</p>
              <button
                onClick={addAction}
                className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add action
              </button>
            </div>

            {actions.map((action, idx) => (
              <ActionEditor
                key={action.id}
                action={action}
                index={idx}
                tmplsFor={tmplsFor}
                userList={userList}
                onChange={patch => updateAction(action.id, patch)}
                onRemove={() => removeAction(action.id)}
                canRemove={actions.length > 1}
              />
            ))}
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-1 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Rule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Single Action Editor ─────────────────────────────────────

function ActionEditor({ action, index, tmplsFor, userList, onChange, onRemove, canRemove }: {
  action: ActionStep;
  index: number;
  tmplsFor: (ch: string) => any[];
  userList: any[];
  onChange: (patch: Partial<ActionStep>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const ActionIcon = ACTION_TYPES.find(a => a.value === action.type)?.icon ?? Zap;

  return (
    <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
      {/* Action header */}
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
          {index + 1}
        </span>

        {/* Action type selector */}
        <select
          value={action.type}
          onChange={e => onChange({ type: e.target.value as ActionStep["type"], channel: undefined, templateId: undefined, toStage: undefined })}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {ACTION_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {canRemove && (
          <button onClick={onRemove} className="rounded p-0.5 text-muted-foreground hover:text-red-500 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Action body */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {action.type === "send_message" && (
          <>
            {/* Channel */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Channel *</label>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => onChange({ channel: ch.value, templateId: undefined })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      action.channel === ch.value
                        ? `${ch.bg} ${ch.color} border-current`
                        : "border-border text-muted-foreground hover:border-slate-300"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Template * {action.channel ? `(${action.channel})` : ""}
              </label>
              <select
                value={action.templateId ?? ""}
                onChange={e => onChange({ templateId: e.target.value || undefined })}
                disabled={!action.channel}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">— Select template —</option>
                {tmplsFor(action.channel ?? "").map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {action.channel && tmplsFor(action.channel).length === 0 && (
                <p className="mt-1 text-[10px] text-amber-600">
                  No {action.channel} templates yet. Create one in Settings → Templates.
                </p>
              )}
            </div>
          </>
        )}

        {action.type === "assign_task" && (
          <>
            <div className="col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Task Title *</label>
              <Input
                value={action.title ?? ""}
                onChange={e => onChange({ title: e.target.value })}
                placeholder="e.g. Follow-up call with lead"
                className="text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Task Type</label>
              <select
                value={action.taskType ?? "call"}
                onChange={e => onChange({ taskType: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TASK_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Priority</label>
              <select
                value={action.priority ?? "high"}
                onChange={e => onChange({ priority: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Due in (hours)</label>
              <Input
                type="number" min={1} value={action.dueHours ?? 24}
                onChange={e => onChange({ dueHours: parseInt(e.target.value, 10) || 24 })}
                className="text-xs"
              />
            </div>
          </>
        )}

        {action.type === "change_stage" && (
          <div className="col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Move lead to stage *</label>
            <select
              value={action.toStage ?? ""}
              onChange={e => onChange({ toStage: e.target.value })}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Select stage —</option>
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}

        {action.type === "escalate" && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Escalate to (optional)</label>
              <select
                value={action.toUserId ?? ""}
                onChange={e => onChange({ toUserId: e.target.value || undefined })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Auto (manager/admin) —</option>
                {userList.filter((u: any) => ["admin", "manager"].includes(u.role)).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Escalation note</label>
              <Input
                value={action.message ?? ""}
                onChange={e => onChange({ message: e.target.value })}
                placeholder="e.g. Lead unresponsive for 48h"
                className="text-xs"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
