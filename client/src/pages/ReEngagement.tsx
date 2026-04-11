import { useState } from "react";
import { Plus, Play, Pause, Eye, History, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDateTime, STAGE_LABELS, STAGE_COLORS } from "../lib/utils.js";
import { useAuth } from "../lib/auth.js";

const CHANNELS = ["whatsapp", "sms", "email"] as const;
const STAGES = ["new", "contacted", "qualified", "demo", "interested", "payment"];

export function ReEngagementPage() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "manager";
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [logId, setLogId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reengagement"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/reengagement"),
  });

  const campaigns = data?.data ?? [];

  return (
    <AppShell title="Re-engagement Campaigns">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
        {isManager && (
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        )}
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            isManager={isManager}
            onEdit={() => setEditing(c)}
            onPreview={() => setPreviewId(c.id)}
            onLog={() => setLogId(c.id)}
          />
        ))}
      </div>

      {campaigns.length === 0 && !isLoading && (
        <div className="mt-16 text-center">
          <Users2 className="mx-auto mb-3 h-12 w-12 text-gray-200" />
          <p className="text-gray-500">No re-engagement campaigns yet</p>
          {isManager && (
            <Button className="mt-3" onClick={() => setShowNew(true)}>
              Create Your First Campaign
            </Button>
          )}
        </div>
      )}

      {(showNew || editing) && (
        <CampaignFormDialog
          campaign={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
        />
      )}

      {previewId && (
        <PreviewLeadsDialog
          campaignId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}

      {logId && (
        <SendHistoryDialog
          campaignId={logId}
          onClose={() => setLogId(null)}
        />
      )}
    </AppShell>
  );
}

// ─── Campaign Card ──────────────────────────────────────────

function CampaignCard({
  campaign: c,
  isManager,
  onEdit,
  onPreview,
  onLog,
}: {
  campaign: any;
  isManager: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onLog: () => void;
}) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/reengagement/${c.id}`, { isActive: !c.is_active }),
    onSuccess: () => {
      toast.success(c.is_active ? "Campaign paused" : "Campaign activated");
      qc.invalidateQueries({ queryKey: ["reengagement"] });
    },
    onError: () => toast.error("Failed to update"),
  });

  const CHANNEL_ICON: Record<string, string> = {
    whatsapp: "💬", sms: "📱", email: "📧",
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm">{c.name}</CardTitle>
          <Badge variant={c.is_active ? "default" : "outline"}>
            {c.is_active ? "Active" : "Paused"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {c.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Channel</span>
            <p className="font-medium text-gray-700">
              {CHANNEL_ICON[c.channel] ?? ""} {c.channel}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Dormant Days</span>
            <p className="font-medium text-gray-700">{c.dormant_days}+ days</p>
          </div>
          <div>
            <span className="text-gray-400">Target Stage</span>
            <p className="font-medium text-gray-700">
              {c.target_stage ? (STAGE_LABELS[c.target_stage] ?? c.target_stage) : "All stages"}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Max Attempts</span>
            <p className="font-medium text-gray-700">{c.max_attempts}</p>
          </div>
        </div>

        {c.template_name && (
          <p className="text-xs text-gray-500">
            Template: <span className="font-medium text-gray-700">{c.template_name}</span>
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{c.total_sent ?? 0} sent</span>
          <span>·</span>
          <span>{c.total_responses ?? 0} responses</span>
          {Number(c.total_sent) > 0 && (
            <>
              <span>·</span>
              <span className="font-medium text-green-600">
                {Math.round((Number(c.total_responses) / Number(c.total_sent)) * 100)}% rate
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 border-t border-gray-100 pt-2">
          <button
            onClick={onPreview}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
          <button
            onClick={onLog}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <History className="h-3 w-3" /> History
          </button>
          {isManager && (
            <>
              <button
                onClick={onEdit}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => toggle.mutate()}
                className={`ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs ${
                  c.is_active
                    ? "text-gray-500 hover:bg-red-50 hover:text-red-600"
                    : "text-gray-500 hover:bg-green-50 hover:text-green-600"
                }`}
              >
                {c.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {c.is_active ? "Pause" : "Activate"}
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Campaign Form Dialog ───────────────────────────────────

function CampaignFormDialog({ campaign, onClose }: { campaign?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!campaign;

  const [form, setForm] = useState({
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    targetStage: campaign?.target_stage ?? "",
    dormantDays: campaign?.dormant_days ?? 30,
    channel: campaign?.channel ?? "whatsapp",
    templateId: campaign?.template_id ?? "",
    maxAttempts: campaign?.max_attempts ?? 3,
  });

  const { data: templatesData } = useQuery({
    queryKey: ["comms-templates"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/comms/templates"),
  });
  const templates = templatesData?.data ?? [];

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? apiRequest("PATCH", `/api/reengagement/${campaign.id}`, {
            name: form.name,
            dormantDays: Number(form.dormantDays),
            channel: form.channel,
            templateId: form.templateId || undefined,
            maxAttempts: Number(form.maxAttempts),
          })
        : apiRequest("POST", "/api/reengagement", {
            ...form,
            dormantDays: Number(form.dormantDays),
            maxAttempts: Number(form.maxAttempts),
            targetStage: form.targetStage || undefined,
            templateId: form.templateId || undefined,
          }),
    onSuccess: () => {
      toast.success(isEdit ? "Campaign updated" : "Campaign created");
      qc.invalidateQueries({ queryKey: ["reengagement"] });
      onClose();
    },
    onError: () => toast.error("Failed to save campaign"),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New Re-engagement Campaign"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Field label="Campaign Name *">
            <Input value={form.name} onChange={f("name")} placeholder="Win-back dormant leads" />
          </Field>
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={f("description")}
              className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel *">
              <select
                value={form.channel}
                onChange={f("channel")}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </Field>
            <Field label="Target Stage">
              <select
                value={form.targetStage}
                onChange={f("targetStage")}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dormant Days *">
              <Input
                type="number"
                value={form.dormantDays}
                onChange={f("dormantDays")}
                min={1}
                placeholder="30"
              />
            </Field>
            <Field label="Max Attempts">
              <Input
                type="number"
                value={form.maxAttempts}
                onChange={f("maxAttempts")}
                min={1}
                max={10}
                placeholder="3"
              />
            </Field>
          </div>
          <Field label="Message Template">
            <select
              value={form.templateId}
              onChange={f("templateId")}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {templates
                .filter((t: any) => t.channel === form.channel && t.is_active)
                .map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dormant Leads Dialog ───────────────────────────

function PreviewLeadsDialog({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reengagement-preview", campaignId],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", `/api/reengagement/${campaignId}/leads`),
  });

  const leads = data?.data ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dormant Leads Preview</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 mb-3">
          {leads.length} leads would be targeted by this campaign
        </p>

        {isLoading && <p className="text-sm text-gray-400">Loading...</p>}

        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {["Lead", "Phone", "Stage", "Dormant", "Attempts"].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l: any) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{l.full_name}</p>
                    <p className="text-xs text-gray-400">{l.lead_no}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{l.phone}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[l.stage] ?? ""}`}>
                      {STAGE_LABELS[l.stage] ?? l.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{l.dormant_days ?? "N/A"}d</td>
                  <td className="px-3 py-2 text-gray-600">{l.attempts ?? 0}</td>
                </tr>
              ))}
              {leads.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No dormant leads match this campaign's criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Send History Dialog ────────────────────────────────────

function SendHistoryDialog({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reengagement-log", campaignId],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", `/api/reengagement/${campaignId}/log`),
  });

  const logs = data?.data ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send History</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-gray-400">Loading...</p>}

        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                {["Lead", "Phone", "Attempt", "Sent At", "Response"].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{l.lead_name}</td>
                  <td className="px-3 py-2 text-gray-600">{l.lead_phone}</td>
                  <td className="px-3 py-2 text-gray-600">#{l.attempt_number}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDateTime(l.sent_at)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={l.response_received ? "default" : "outline"}>
                      {l.response_received ? "Replied" : "No reply"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No messages sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
