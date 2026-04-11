import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Phone, Mail, MapPin, Pencil, Send, CheckSquare, Clock, ChevronDown, AlertTriangle, Save, CalendarPlus, Video, MapPin as LocationIcon, Activity } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { useLead, useUpdateLeadStage } from "../hooks/useLeads.js";
import { useCreateTask } from "../hooks/useFollowUps.js";
import { apiRequest } from "../lib/queryClient.js";
import { STAGE_COLORS, STAGE_LABELS, formatDateTime, timeAgo, getScoreLabel } from "../lib/utils.js";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STAGES = ["new","contacted","qualified","demo","interested","payment","admitted","lost"];
const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬", email: "📧", sms: "📱", ivr: "📞", manual_call: "📞",
};

export function LeadDetailPage() {
  const [, params] = useRoute("/leads/:id");
  const id = params?.id ?? "";
  const [, navigate] = useLocation();

  const { data, isLoading } = useLead(id);
  const updateStage = useUpdateLeadStage();
  const createTask  = useCreateTask();
  const qc = useQueryClient();

  const [showSend,     setShowSend]     = useState(false);
  const [showTask,     setShowTask]     = useState(false);
  const [showStage,    setShowStage]    = useState(false);
  const [showDemo,     setShowDemo]     = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  if (isLoading) return <AppShell title="Lead Detail"><p className="text-gray-500">Loading…</p></AppShell>;
  const lead = data?.data;
  if (!lead) return <AppShell title="Lead Detail"><p className="text-gray-500">Lead not found.</p></AppShell>;

  const scoreInfo = getScoreLabel(lead.lead_score);

  const handleStageChange = async (toStage: string) => {
    try {
      await updateStage.mutateAsync({ id, stage: toStage });
      toast.success(`Stage updated to ${STAGE_LABELS[toStage]}`);
      setShowStage(false);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/leads")} className="rounded-lg p-1.5 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{lead.full_name}</h1>
            <p className="text-sm text-gray-500">{lead.lead_no} · {lead.source?.replace(/_/g," ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Stage changer */}
          <div className="relative">
            <button onClick={() => setShowStage(!showStage)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium ${STAGE_COLORS[lead.stage]}`}>
              {STAGE_LABELS[lead.stage]} <ChevronDown className="h-3 w-3" />
            </button>
            {showStage && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {STAGES.map((s) => (
                  <button key={s} onClick={() => handleStageChange(s)}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${lead.stage === s ? "font-medium text-blue-600" : "text-gray-700"}`}>
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}>
            <Activity className="h-4 w-4" /> Log Activity
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDemo(true)}>
            <CalendarPlus className="h-4 w-4" /> Schedule Demo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSend(true)}>
            <Send className="h-4 w-4" /> Message
          </Button>
          <Button size="sm" onClick={() => setShowTask(true)}>
            <CheckSquare className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — Lead Info */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email ?? "—"} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={lead.city ?? "—"} />
              <InfoRow icon={<Pencil className="h-4 w-4" />} label="Qualification" value={lead.qualification ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Lead Score</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563EB" strokeWidth="3"
                      strokeDasharray={`${lead.lead_score} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                    {lead.lead_score}
                  </span>
                </div>
                <div>
                  <p className={`font-semibold ${scoreInfo.color}`}>{scoreInfo.label}</p>
                  <p className="text-xs text-gray-500">out of 100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Stage History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lead.stageHistory?.length === 0 && <p className="text-sm text-gray-400">No history</p>}
              {lead.stageHistory?.slice(0, 5).map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[h.to_stage]}`}>
                    {STAGE_LABELS[h.to_stage]}
                  </span>
                  <span className="text-gray-400">{timeAgo(h.changed_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Referral Info */}
          <ReferralCard leadId={id} referrer={lead.referrer} referrals={lead.referrals ?? []} />

          {/* Objection Tracking */}
          <ObjectionNotes leadId={id} objectionNotes={lead.objection_notes ?? ""} lostReason={lead.lost_reason ?? ""} stage={lead.stage} />
        </div>

        {/* Right — Timeline */}
        <div className="space-y-4 lg:col-span-2">
          {/* Demo Sessions */}
          <DemoSessionsCard leadId={id} />

          {/* Pending Tasks */}
          {lead.tasks?.filter((t: any) => t.status !== "done" && t.status !== "cancelled").length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pending Tasks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {lead.tasks.filter((t: any) => t.status !== "done" && t.status !== "cancelled").map((task: any) => (
                  <TaskRow key={task.id} task={task} leadId={id} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Communication Timeline */}
          <Card>
            <CardHeader><CardTitle>Communication Timeline</CardTitle></CardHeader>
            <CardContent>
              {lead.communications?.length === 0 && <p className="text-sm text-gray-400">No communications yet</p>}
              <div className="space-y-3">
                {lead.communications?.map((comm: any) => (
                  <div key={comm.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-base">
                      {CHANNEL_ICONS[comm.channel] ?? "💬"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium capitalize text-gray-700">
                          {comm.direction === "inbound" ? "Received" : "Sent"} via {comm.channel}
                        </span>
                        <CommStatusBadge status={comm.status} />
                        <span className="ml-auto text-xs text-gray-400">{timeAgo(comm.created_at)}</span>
                      </div>
                      {comm.subject && <p className="mt-0.5 text-xs font-medium text-gray-600">{comm.subject}</p>}
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-700">{comm.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Activity Dialog */}
      <LogActivityDialog open={showActivity} onClose={() => setShowActivity(false)} leadId={id} />

      {/* Schedule Demo Dialog */}
      <ScheduleDemoDialog open={showDemo} onClose={() => setShowDemo(false)} leadId={id} />

      {/* Send Message Dialog */}
      <SendMessageDialog open={showSend} onClose={() => setShowSend(false)} leadId={id} />

      {/* Add Task Dialog */}
      <AddTaskDialog open={showTask} onClose={() => setShowTask(false)} leadId={id} assignedTo={lead.assigned_to} />
    </AppShell>
  );
}

// ─── Referral Card ────────────────────────────────────────────
function ReferralCard({ leadId, referrer, referrals }: { leadId: string; referrer: any; referrals: any[] }) {
  const qc = useQueryClient();
  const [searchRef, setSearchRef] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchData } = useQuery({
    queryKey: ["leads-ref-search", searchRef],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(searchRef)}&limit=8`),
    enabled: searchRef.length > 1,
  });
  const searchResults: any[] = searchData?.data ?? [];

  const setReferrer = async (refId: string | null) => {
    await apiRequest("PATCH", `/api/leads/${leadId}/referred-by`, { referredBy: refId });
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    setShowSearch(false);
    setSearchRef("");
    toast.success(refId ? "Referrer set" : "Referrer removed");
  };

  if (!referrer && referrals.length === 0 && !showSearch) {
    return (
      <Card>
        <CardContent className="p-4">
          <button onClick={() => setShowSearch(true)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            + Set referrer
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Referral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {referrer && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800">Referred by</p>
              <p className="text-sm font-semibold">{referrer.full_name}</p>
              <p className="text-xs text-gray-500">{referrer.phone} · {referrer.stage}</p>
            </div>
            <button onClick={() => setReferrer(null)} className="text-[10px] text-red-500 hover:underline">Remove</button>
          </div>
        )}

        {referrals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Referred {referrals.length} lead{referrals.length > 1 ? "s" : ""}</p>
            {referrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-1 border-b last:border-0">
                <div>
                  <p className="text-xs font-medium">{r.full_name}</p>
                  <p className="text-[10px] text-gray-400">{r.phone}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[r.stage] ?? "bg-gray-100"}`}>
                  {r.stage}
                </span>
              </div>
            ))}
          </div>
        )}

        {!referrer && (
          <div>
            {showSearch ? (
              <div className="relative">
                <Input placeholder="Search referrer by name/phone…" value={searchRef} onChange={(e) => setSearchRef(e.target.value)}
                  autoFocus className="text-xs" />
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.filter((r: any) => r.id !== leadId).map((r: any) => (
                      <button key={r.id} onClick={() => setReferrer(r.id)}
                        className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-gray-50 border-b last:border-0">
                        <span className="text-xs font-medium">{r.full_name}</span>
                        <span className="text-[10px] text-gray-400">{r.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} className="text-xs text-blue-600 hover:underline">+ Set referrer</button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ObjectionNotes({ leadId, objectionNotes, lostReason, stage }: { leadId: string; objectionNotes: string; lostReason: string; stage: string }) {
  const [notes, setNotes] = useState(objectionNotes);
  const [reason, setReason] = useState(lostReason);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { setNotes(objectionNotes); }, [objectionNotes]);
  useEffect(() => { setReason(lostReason); }, [lostReason]);

  const dirty = notes !== objectionNotes || reason !== lostReason;

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/leads/${leadId}`, {
        objectionNotes: notes || null,
        lostReason: reason || null,
      });
      toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          Objections & Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Objection Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex min-h-[72px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Record lead objections, concerns, or blockers..."
          />
        </div>
        {(stage === "lost" || reason) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Lost Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select reason...</option>
              <option value="fee_too_high">Fee too high</option>
              <option value="chose_competitor">Chose competitor</option>
              <option value="not_interested">Not interested anymore</option>
              <option value="location_issue">Location / distance issue</option>
              <option value="timing_issue">Timing / schedule conflict</option>
              <option value="no_response">No response / unreachable</option>
              <option value="already_enrolled">Already enrolled elsewhere</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving} className="w-full">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Notes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function CommStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "bg-gray-100 text-gray-600", sent: "bg-blue-100 text-blue-600",
    delivered: "bg-green-100 text-green-600", read: "bg-purple-100 text-purple-600",
    failed: "bg-red-100 text-red-600", replied: "bg-yellow-100 text-yellow-600",
  };
  return <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>{status}</span>;
}

function TaskRow({ task, leadId }: { task: any; leadId: string }) {
  const qc = useQueryClient();

  const markDone = async () => {
    await apiRequest("PATCH", `/api/tasks/${task.id}`, { status: "done" });
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const priorityColor: Record<string, string> = {
    urgent: "border-red-300 bg-red-50",
    high: "border-orange-300 bg-orange-50",
    medium: "border-blue-200 bg-blue-50",
    low: "border-gray-200 bg-gray-50",
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${priorityColor[task.priority] ?? ""}`}>
      <button onClick={markDone} className="mt-0.5 shrink-0 rounded-full border-2 border-gray-400 p-0.5 hover:border-green-500">
        <CheckSquare className="h-3.5 w-3.5 text-transparent" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>Due {formatDateTime(task.due_at)}</span>
          <span className="capitalize">· {task.task_type.replace(/_/g," ")}</span>
        </div>
      </div>
    </div>
  );
}

function SendMessageDialog({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const { register, handleSubmit, reset } = useForm<{ channel: string; body: string; subject: string }>();
  const qc = useQueryClient();

  const onSubmit = async (data: any) => {
    try {
      await apiRequest("POST", "/api/comms/send", { ...data, leadId });
      toast.success("Message queued");
      reset(); onClose();
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Send Message</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Channel</label>
            <select {...register("channel")}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Subject (Email only)</label>
            <Input {...register("subject")} placeholder="Subject line" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Message *</label>
            <textarea {...register("body", { required: true })}
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit"><Send className="h-4 w-4" /> Send</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddTaskDialog({ open, onClose, leadId, assignedTo }: { open: boolean; onClose: () => void; leadId: string; assignedTo?: string }) {
  const createTask = useCreateTask();
  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: { taskType: "call", priority: "medium" },
  });

  const onSubmit = async (data: any) => {
    try {
      await createTask.mutateAsync({ ...data, leadId, assignedTo: assignedTo ?? data.assignedTo });
      toast.success("Task created");
      reset(); onClose();
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Title *</label>
            <Input {...register("title", { required: true })} placeholder="Call to confirm demo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
              <select {...register("taskType")}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["call","whatsapp","email","sms","meeting","demo","follow_up","other"].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Priority</label>
              <select {...register("priority")}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["low","medium","high","urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Due Date & Time *</label>
            <Input {...register("dueAt", { required: true })} type="datetime-local" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Demo Sessions Card ───────────────────────────────────────
const DEMO_STATUS_COLORS: Record<string, string> = {
  scheduled:  "bg-blue-100 text-blue-700",
  completed:  "bg-green-100 text-green-700",
  no_show:    "bg-red-100 text-red-700",
  cancelled:  "bg-gray-100 text-gray-500",
};
const OUTCOME_COLORS: Record<string, string> = {
  interested:     "bg-emerald-100 text-emerald-700",
  enrolled:       "bg-purple-100 text-purple-700",
  not_interested: "bg-red-100 text-red-700",
  follow_up:      "bg-amber-100 text-amber-700",
};

function DemoSessionsCard({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["demos", leadId],
    queryFn: () => apiRequest<any>("GET", `/api/demos?leadId=${leadId}`),
    staleTime: 30_000,
  });
  const demos: any[] = data?.data ?? [];

  const updateDemo = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiRequest<any>("PATCH", `/api/demos/${id}`, body),
    onSuccess: () => {
      toast.success("Demo updated");
      qc.invalidateQueries({ queryKey: ["demos", leadId] });
    },
    onError: () => toast.error("Failed to update demo"),
  });

  if (demos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-blue-500" />
        <CardTitle className="text-sm">Demo Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {demos.map((d: any) => (
          <div key={d.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEMO_STATUS_COLORS[d.status] ?? ""}`}>
                    {d.status}
                  </span>
                  {d.outcome && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${OUTCOME_COLORS[d.outcome] ?? ""}`}>
                      {d.outcome.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-700 font-medium">
                  {new Date(d.scheduled_at).toLocaleString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
                  })}
                  {" · "}{d.duration_min} min
                </p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                  {d.mode === "online" ? <Video className="h-3 w-3" /> : <LocationIcon className="h-3 w-3" />}
                  <span>{d.mode}{d.location ? ` — ${d.location}` : ""}</span>
                </div>
                {d.trainer_name && <p className="text-[10px] text-gray-400 mt-0.5">Trainer: {d.trainer_name}</p>}
              </div>
              {d.status === "scheduled" && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => updateDemo.mutate({ id: d.id, body: { status: "completed" } })}
                    className="text-[10px] px-2 py-0.5 rounded border border-green-300 text-green-700 hover:bg-green-50">
                    Mark Attended
                  </button>
                  <button onClick={() => updateDemo.mutate({ id: d.id, body: { status: "no_show" } })}
                    className="text-[10px] px-2 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50">
                    No Show
                  </button>
                </div>
              )}
            </div>
            {d.status === "completed" && !d.outcome && (
              <div className="flex gap-1 flex-wrap">
                {["interested","enrolled","not_interested","follow_up"].map((o) => (
                  <button key={o} onClick={() => updateDemo.mutate({ id: d.id, body: { outcome: o } })}
                    className="text-[10px] px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 capitalize">
                    {o.replace(/_/g," ")}
                  </button>
                ))}
              </div>
            )}
            {d.notes && <p className="text-xs text-gray-500 italic">{d.notes}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Log Activity Dialog ──────────────────────────────────────
function LogActivityDialog({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    activity_type: "call", duration_min: "", outcome: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/activities", body),
    onSuccess: () => {
      toast.success("Activity logged");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      onClose();
    },
    onError: () => toast.error("Failed to log activity"),
  });

  const handleSave = () => {
    mutation.mutate({
      lead_id: leadId,
      activity_type: form.activity_type,
      duration_sec: form.duration_min ? Math.round(parseFloat(form.duration_min) * 60) : null,
      outcome: form.outcome || null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.activity_type} onValueChange={(v) => set("activity_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["call","whatsapp","email","sms","meeting","visit","demo","other"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.activity_type === "call" && (
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min="0" step="0.5" className="mt-1" value={form.duration_min}
                  onChange={(e) => set("duration_min", e.target.value)} placeholder="e.g. 3.5" />
              </div>
            )}
          </div>

          {form.activity_type === "call" && (
            <div>
              <Label>Outcome</Label>
              <Select value={form.outcome || "none"} onValueChange={(v) => set("outcome", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="reached">Reached</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="call_back">Call Back</SelectItem>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Input className="mt-1" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Log Activity"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Schedule Demo Dialog ─────────────────────────────────────
function ScheduleDemoDialog({ open, onClose, leadId }: { open: boolean; onClose: () => void; leadId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    scheduled_at: "", duration_min: "60", mode: "offline", location: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/demos", body),
    onSuccess: () => {
      toast.success("Demo scheduled — WhatsApp reminders queued (24h + 1h before)");
      qc.invalidateQueries({ queryKey: ["demos", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      onClose();
    },
    onError: () => toast.error("Failed to schedule demo"),
  });

  const handleSave = () => {
    if (!form.scheduled_at) { toast.error("Select date and time"); return; }
    mutation.mutate({
      lead_id: leadId,
      scheduled_at: form.scheduled_at,
      duration_min: parseInt(form.duration_min),
      mode: form.mode,
      location: form.location || null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Schedule Demo Session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" className="mt-1" value={form.scheduled_at}
                onChange={(e) => set("scheduled_at", e.target.value)} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min="15" step="15" className="mt-1" value={form.duration_min}
                onChange={(e) => set("duration_min", e.target.value)} />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">In-person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{form.mode === "online" ? "Meeting Link" : "Room / Location"}</Label>
              <Input className="mt-1" value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder={form.mode === "online" ? "https://meet.google.com/..." : "Room 101, Ground Floor"} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input className="mt-1" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <p className="text-xs text-gray-400">WhatsApp reminders will be sent 24h and 1h before the session.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? "Scheduling…" : "Schedule Demo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
