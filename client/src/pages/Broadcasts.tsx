import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send, Plus, Users, CheckCircle2, XCircle, Clock, Radio,
  ChevronDown, ChevronUp, AlertTriangle,
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
import { Progress } from "../components/ui/progress.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

const STATUS_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  draft:     { label: "Draft",     color: "bg-gray-100 text-gray-600",       icon: <Clock        className="h-3 w-3" /> },
  queued:    { label: "Queued",    color: "bg-amber-100 text-amber-700",     icon: <Clock        className="h-3 w-3" /> },
  running:   { label: "Sending…",  color: "bg-blue-100 text-blue-700",       icon: <Radio        className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed:    { label: "Failed",    color: "bg-red-100 text-red-700",         icon: <XCircle      className="h-3 w-3" /> },
};

const STAGES = ["new", "contacted", "interested", "demo_scheduled", "demo_done", "negotiation", "admitted", "not_interested", "lost"];

export function BroadcastsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => apiRequest<any>("GET", "/api/broadcasts"),
    staleTime: 15_000,
    refetchInterval: 8_000, // poll while running
  });
  const broadcasts: any[] = data?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>("POST", `/api/broadcasts/${id}/send`),
    onSuccess: () => { toast.success("Broadcast started — sending in background"); qc.invalidateQueries({ queryKey: ["broadcasts"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start broadcast"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>("DELETE", `/api/broadcasts/${id}`),
    onSuccess: () => { toast.success("Draft deleted"); qc.invalidateQueries({ queryKey: ["broadcasts"] }); },
  });

  return (
    <AppShell title="WhatsApp Broadcasts">
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Broadcast</Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : broadcasts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Send className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>No broadcasts yet. Create one to message a lead segment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const meta = STATUS_META[b.status] ?? STATUS_META.draft;
            const sentPct = b.total_count > 0 ? Math.round((b.sent_count / b.total_count) * 100) : 0;
            const isOpen = expanded === b.id;

            return (
              <Card key={b.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{b.name}</p>
                        <Badge className={`text-[10px] flex items-center gap-1 ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {b.total_count ?? 0} recipients
                        </span>
                      </div>

                      {["running", "completed"].includes(b.status) && b.total_count > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-700">{b.sent_count} sent</span>
                            {b.failed_count > 0 && <span className="text-red-600">{b.failed_count} failed</span>}
                            <span className="text-gray-400">{sentPct}%</span>
                          </div>
                          <Progress value={sentPct} className="h-1.5" />
                        </div>
                      )}

                      {isOpen && (
                        <div className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap">
                          {b.message_body}
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1">
                        By {b.created_by_name} · {formatDate(b.created_at)}
                        {b.completed_at && ` · Completed ${formatDate(b.completed_at)}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {b.status === "draft" && (
                        <>
                          <Button size="sm" className="h-7 text-xs"
                            onClick={() => sendMutation.mutate(b.id)}
                            disabled={sendMutation.isPending}>
                            <Send className="h-3 w-3" /> Send
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500"
                            onClick={() => deleteMutation.mutate(b.id)}>
                            Delete
                          </Button>
                        </>
                      )}
                      <button onClick={() => setExpanded(isOpen ? null : b.id)} className="text-gray-400 hover:text-gray-600">
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

      {showNew && <NewBroadcastDialog onClose={() => setShowNew(false)} />}
    </AppShell>
  );
}

function NewBroadcastDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "", message_body: "",
    stage: "", courseId: "", batchId: "", source: "",
  });
  const [preview, setPreview] = useState<number | null>(null);
  const set = (k: string, v: string) => { setF((p) => ({ ...p, [k]: v })); setPreview(null); };

  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest<any>("GET", "/api/admin/courses"),
  });
  const courses: any[] = coursesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/broadcasts", body),
    onSuccess: (data) => {
      setPreview(data.preview?.recipientCount ?? 0);
      qc.invalidateQueries({ queryKey: ["broadcasts"] });
    },
    onError: () => toast.error("Failed to create broadcast"),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>("POST", `/api/broadcasts/${id}/send`),
    onSuccess: () => {
      toast.success("Broadcast started!");
      qc.invalidateQueries({ queryKey: ["broadcasts"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to start"),
  });

  const [createdId, setCreatedId] = useState<string | null>(null);

  const handlePreview = () => {
    if (!f.name || !f.message_body) { toast.error("Name and message required"); return; }
    const filters: Record<string, string> = {};
    if (f.stage)    filters.stage    = f.stage;
    if (f.courseId) filters.courseId = f.courseId;
    if (f.batchId)  filters.batchId  = f.batchId;
    if (f.source)   filters.source   = f.source;
    createMutation.mutate({ name: f.name, message_body: f.message_body, filters });
  };

  // Capture created broadcast id from mutation data
  const handleSend = () => {
    const data = (createMutation.data as any);
    const id = data?.data?.id ?? createdId;
    if (!id) { handlePreview(); return; }
    sendMutation.mutate(id);
  };

  // Store id when preview is shown
  if ((createMutation.data as any)?.data?.id && !createdId) {
    setCreatedId((createMutation.data as any).data.id);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New WhatsApp Broadcast</DialogTitle></DialogHeader>

        <div className="space-y-3 py-1">
          <div><Label>Campaign Name *</Label><Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Apr Batch Reminder" /></div>

          <div className="rounded-lg border p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">Audience Filters</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Stage</Label>
                <Select value={f.stage || "all"} onValueChange={(v) => set("stage", v === "all" ? "" : v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Any stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any stage</SelectItem>
                    {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Course</Label>
                <Select value={f.courseId || "all"} onValueChange={(v) => set("courseId", v === "all" ? "" : v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Any course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any course</SelectItem>
                    {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Input className="mt-1 h-8 text-xs" value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="e.g. facebook" />
              </div>
            </div>
          </div>

          <div>
            <Label>Message *</Label>
            <Textarea className="mt-1 text-sm" rows={5} value={f.message_body}
              onChange={(e) => set("message_body", e.target.value)}
              placeholder={"Hi {{name}}, we have an exciting update for you!\n\nReply STOP to opt out."} />
            <p className="text-xs text-gray-400 mt-1">Use <code>{"{{name}}"}</code> for recipient's name</p>
          </div>

          {preview !== null && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 ${preview === 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
              {preview === 0
                ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                : <Users className="h-4 w-4 text-emerald-600 shrink-0" />}
              <p className="text-sm font-medium">
                {preview === 0
                  ? "No leads match the selected filters"
                  : `${preview} lead${preview !== 1 ? "s" : ""} will receive this message`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {preview === null || preview === 0 ? (
            <Button onClick={handlePreview} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Checking…" : "Preview Audience"}
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={sendMutation.isPending} className="bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4" />
              {sendMutation.isPending ? "Starting…" : `Send to ${preview} leads`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
