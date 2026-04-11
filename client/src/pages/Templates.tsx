import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare, Plus, CheckCircle2, Clock, XCircle, PauseCircle,
  FileEdit, Send, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

const APPROVAL_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  draft:    { label: "Draft",    color: "bg-gray-100 text-gray-600",    icon: <FileEdit  className="h-3 w-3" /> },
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700",  icon: <Clock     className="h-3 w-3" /> },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700",      icon: <XCircle   className="h-3 w-3" /> },
  paused:   { label: "Paused",   color: "bg-slate-100 text-slate-600",  icon: <PauseCircle className="h-3 w-3" /> },
};

export function TemplatesPage() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["templates", channel, approvalFilter],
    queryFn: () =>
      apiRequest<any>("GET", `/api/comms/templates?all=true${channel ? `&channel=${channel}` : ""}${approvalFilter ? `&approvalStatus=${approvalFilter}` : ""}`),
    staleTime: 30_000,
  });
  const templates: any[] = data?.data ?? [];

  const submitMutation = useMutation({
    mutationFn: ({ id, metaTemplateName }: { id: string; metaTemplateName?: string }) =>
      apiRequest<any>("POST", `/api/comms/templates/${id}/submit`, { metaTemplateName }),
    onSuccess: () => { toast.success("Submitted to Meta for approval"); qc.invalidateQueries({ queryKey: ["templates"] }); },
    onError: () => toast.error("Submit failed"),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest<any>("PATCH", `/api/comms/templates/${id}`, body),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["templates"] }); setEditItem(null); },
    onError: () => toast.error("Update failed"),
  });

  // Counts per status
  const counts = templates.reduce<Record<string, number>>((acc, t) => {
    acc[t.approval_status] = (acc[t.approval_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell title="WhatsApp Templates">
      {/* Summary badges */}
      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(APPROVAL_META).map(([status, meta]) => (
          counts[status] ? (
            <button key={status} onClick={() => setApprovalFilter(approvalFilter === status ? "" : status)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${approvalFilter === status ? "ring-2 ring-offset-1 ring-indigo-400" : ""} ${meta.color}`}>
              {meta.icon} {meta.label} ({counts[status]})
            </button>
          ) : null
        ))}
      </div>

      {/* Filters + New */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={channel || "all"} onValueChange={(v) => setChannel(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All channels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {approvalFilter && (
          <Badge className="bg-indigo-100 text-indigo-700 cursor-pointer" onClick={() => setApprovalFilter("")}>
            {APPROVAL_META[approvalFilter]?.label} ×
          </Badge>
        )}
        <Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Template</Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>No templates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const meta = APPROVAL_META[t.approval_status] ?? APPROVAL_META.draft;
            const isWA = t.channel === "whatsapp";
            const canSubmit = isWA && ["draft", "rejected"].includes(t.approval_status);
            const isOpen = expanded === t.id;

            return (
              <Card key={t.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{t.name}</p>
                        <Badge className={`text-[10px] flex items-center gap-1 ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-600 text-[10px] capitalize">{t.channel}</Badge>
                        {!t.is_active && <Badge className="bg-gray-100 text-gray-500 text-[10px]">Inactive</Badge>}
                      </div>
                      {t.trigger_event && (
                        <p className="text-xs text-indigo-600 mb-1">Trigger: {t.trigger_event}</p>
                      )}
                      {t.rejection_reason && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600 mb-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {t.rejection_reason}
                        </div>
                      )}
                      {t.meta_template_name && (
                        <p className="text-xs text-gray-400">Meta name: <code className="bg-gray-50 px-1 rounded">{t.meta_template_name}</code></p>
                      )}
                      {isOpen && (
                        <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                          {t.body}
                        </div>
                      )}
                      {isOpen && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-400">
                          {t.submitted_at && <span>Submitted: {formatDate(t.submitted_at)}</span>}
                          {t.approved_at  && <span>Approved:  {formatDate(t.approved_at)}</span>}
                          {t.meta_template_id && <span>Meta ID: {t.meta_template_id}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canSubmit && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => submitMutation.mutate({ id: t.id, metaTemplateName: t.wa_template_name ?? undefined })}
                          disabled={submitMutation.isPending}>
                          <Send className="h-3 w-3" /> Submit
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditItem(t)}>Edit</Button>
                      <button onClick={() => setExpanded(isOpen ? null : t.id)} className="text-gray-400 hover:text-gray-600">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showNew && <TemplateFormDialog onClose={() => setShowNew(null as any)} />}
      {editItem && <TemplateFormDialog template={editItem} onClose={() => setEditItem(null)} />}
    </AppShell>
  );
}

function TemplateFormDialog({ template, onClose }: { template?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!template;
  const [f, setF] = useState({
    name: template?.name ?? "",
    channel: template?.channel ?? "whatsapp",
    triggerEvent: template?.trigger_event ?? "",
    subject: template?.subject ?? "",
    body: template?.body ?? "",
    waTemplateName: template?.wa_template_name ?? "",
    metaTemplateId: template?.meta_template_id ?? "",
    approvalStatus: template?.approval_status ?? "draft",
    rejectionReason: template?.rejection_reason ?? "",
    isActive: template?.is_active ?? true,
  });
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? apiRequest<any>("PATCH", `/api/comms/templates/${template.id}`, body)
        : apiRequest<any>("POST", "/api/comms/templates", body),
    onSuccess: () => {
      toast.success(isEdit ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["templates"] });
      onClose();
    },
    onError: () => toast.error("Failed to save template"),
  });

  const handleSave = () => {
    if (!f.name || !f.channel || !f.body) { toast.error("Name, channel, body required"); return; }
    mutation.mutate({
      name: f.name, channel: f.channel,
      triggerEvent: f.triggerEvent || undefined,
      subject: f.subject || undefined,
      body: f.body,
      waTemplateName: f.waTemplateName || undefined,
      metaTemplateId: f.metaTemplateId || undefined,
      approvalStatus: f.approvalStatus,
      rejectionReason: f.rejectionReason || undefined,
      isActive: f.isActive,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div><Label>Name *</Label><Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Channel *</Label>
              <Select value={f.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approval Status</Label>
              <Select value={f.approvalStatus} onValueChange={(v) => set("approvalStatus", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(APPROVAL_META).map((s) => (
                    <SelectItem key={s} value={s}>{APPROVAL_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Trigger Event</Label><Input className="mt-1" value={f.triggerEvent} onChange={(e) => set("triggerEvent", e.target.value)} placeholder="e.g. lead_created" /></div>
          {f.channel === "email" && (
            <div><Label>Subject</Label><Input className="mt-1" value={f.subject} onChange={(e) => set("subject", e.target.value)} /></div>
          )}
          <div><Label>Body *</Label><Textarea className="mt-1 font-mono text-xs" rows={6} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Use {{variable}} for dynamic values" /></div>
          {f.channel === "whatsapp" && (
            <>
              <div><Label>Meta Template Name</Label><Input className="mt-1 font-mono text-xs" value={f.waTemplateName} onChange={(e) => set("waTemplateName", e.target.value)} placeholder="snake_case_name" /></div>
              <div><Label>Meta Template ID</Label><Input className="mt-1 font-mono text-xs" value={f.metaTemplateId} onChange={(e) => set("metaTemplateId", e.target.value)} placeholder="From Meta dashboard" /></div>
              {f.approvalStatus === "rejected" && (
                <div><Label>Rejection Reason</Label><Textarea className="mt-1 text-xs" rows={2} value={f.rejectionReason} onChange={(e) => set("rejectionReason", e.target.value)} /></div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : isEdit ? "Update" : "Create"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
