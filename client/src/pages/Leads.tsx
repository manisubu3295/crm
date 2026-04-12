import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Upload, Phone, Mail, UserPlus, X, Flame, ArrowRightLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { useLeads, useCreateLead, useUpdateLeadStage } from "../hooks/useLeads.js";
import { STAGE_COLORS, STAGE_LABELS, formatDateTime, getScoreLabel } from "../lib/utils.js";
import { useForm } from "react-hook-form";
import { apiRequest, getAuthHeaders } from "../lib/queryClient.js";

const STAGES = ["new","contacted","qualified","demo","interested","payment","admitted","lost"];

export function LeadsPage() {
  const [view, setView]       = useState<"list" | "kanban">("list");
  const [search, setSearch]   = useState("");
  const [stage, setStage]     = useState("");
  const [source, setSource]   = useState("");
  const [aging, setAging]     = useState("");
  const [showNew, setShowNew] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting]   = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());

  const { data, isLoading } = useLeads({
    ...(search ? { search } : {}),
    ...(stage  ? { stage  } : {}),
    ...(source ? { source } : {}),
    ...(aging  ? { aging  } : {}),
    limit: 50,
  } as any);

  const leads = data?.data ?? [];

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const res = await fetch("/api/admin/import/leads", {
        method: "POST",
        headers: Object.fromEntries(
          Object.entries(getAuthHeaders()).filter(([k]) => k !== "Content-Type")
        ) as Record<string, string>,
        body: form,
      });
      const result = await res.json();
      toast.success(`Import complete: ${result.data?.imported} imported, ${result.data?.duplicates} duplicates`);
      setImportFile(null);
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell title="Leads">
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search name, phone, email…" className="pl-8" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={stage || "all"} onValueChange={(v) => setStage(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={source || "all"} onValueChange={(v) => setSource(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {["meta_ads","website","manual","walk_in","phone","referral","excel_import"].map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={aging || "all"} onValueChange={(v) => setAging(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All aging" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All aging</SelectItem>
            <SelectItem value="fresh">Fresh (&lt;3d)</SelectItem>
            <SelectItem value="aging">Aging (3-7d)</SelectItem>
            <SelectItem value="stale">Stale (&gt;7d)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["list","kanban"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm ${view === v ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <label className="cursor-pointer">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
          <Button variant="outline" size="sm" asChild>
            <span><Upload className="h-4 w-4" /> Import Excel</span>
          </Button>
        </label>
        {importFile && (
          <Button size="sm" onClick={handleImport} disabled={importing}>
            {importing ? "Importing…" : `Upload: ${importFile.name}`}
          </Button>
        )}

        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Lead
        </Button>
      </div>

      {/* Stats bar */}
      <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <span className="font-medium text-gray-900">{data?.meta?.total ?? leads.length}</span> leads
        {(search || stage || source) && <span> (filtered)</span>}
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selected)}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* Views */}
      {view === "kanban" ? (
        <KanbanView leads={leads} />
      ) : (
        <ListView leads={leads} isLoading={isLoading} selected={selected} onSelectChange={setSelected} />
      )}

      {/* New Lead Modal */}
      <NewLeadDialog open={showNew} onClose={() => setShowNew(false)} />
    </AppShell>
  );
}

// ─── List View ────────────────────────────────────────────────

function ListView({ leads, isLoading, selected, onSelectChange }: { leads: any[]; isLoading: boolean; selected: Set<string>; onSelectChange: (s: Set<string>) => void }) {
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectChange(new Set());
    } else {
      onSelectChange(new Set(leads.map((l) => l.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="w-10 px-3 py-3">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </th>
            {["Lead", "Contact", "Course", "Source", "Stage", "Aging", "Score", "Assigned", "Created"].map((h) => (
              <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr><td colSpan={10} className="py-12 text-center text-gray-400">Loading...</td></tr>
          )}
          {!isLoading && leads.length === 0 && (
            <tr><td colSpan={10} className="py-12 text-center text-gray-400">No leads found</td></tr>
          )}
          {leads.map((lead) => {
            const scoreInfo = getScoreLabel(lead.lead_score);
            const checked = selected.has(lead.id);
            const days = lead.days_in_stage ?? 0;
            const agingInfo = days > 7
              ? { label: `${days}d`, cls: "bg-red-100 text-red-700",    row: "border-l-2 border-l-red-400" }
              : days >= 3
              ? { label: `${days}d`, cls: "bg-amber-100 text-amber-700", row: "border-l-2 border-l-amber-400" }
              : { label: `${days}d`, cls: "bg-green-100 text-green-700", row: "" };
            return (
              <tr key={lead.id} className={`border-b border-gray-50 hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""} ${agingInfo.row}`}>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={checked} onChange={() => toggleOne(lead.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`}>
                    <a className="font-medium text-blue-600 hover:underline">{lead.full_name}</a>
                  </Link>
                  <p className="text-xs text-gray-400">{lead.lead_no}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-gray-700"><Phone className="h-3 w-3" />{lead.phone}</span>
                    {lead.email && <span className="flex items-center gap-1 text-gray-500 text-xs"><Mail className="h-3 w-3" />{lead.email}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{lead.course_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{lead.source.replace(/_/g, " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>
                    {STAGE_LABELS[lead.stage] ?? lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${agingInfo.cls}`}>
                    {days > 7 && <Flame className="h-2.5 w-2.5" />}{agingInfo.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${scoreInfo.color}`}>{lead.lead_score}</span>
                  <span className={`ml-1 text-xs ${scoreInfo.color}`}>({scoreInfo.label})</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{lead.assigned_to_name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(lead.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bulk Action Bar ─────────────────────────────────────────

function BulkActionBar({ selectedIds, onClear }: { selectedIds: string[]; onClear: () => void }) {
  const qc = useQueryClient();
  const [assignTo, setAssignTo] = useState("");
  const [bulkStage, setBulkStage] = useState("");
  const [processing, setProcessing] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/admin/users"),
  });
  const users = (usersData?.data ?? []).filter((u: any) => u.is_active);

  const handleBulkAssign = async () => {
    if (!assignTo) return;
    setProcessing(true);
    try {
      await apiRequest("POST", "/api/leads/bulk/assign", { ids: selectedIds, userId: assignTo });
      toast.success(`${selectedIds.length} leads assigned`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClear();
    } catch {
      toast.error("Bulk assign failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStage = async () => {
    if (!bulkStage) return;
    setProcessing(true);
    try {
      await apiRequest("POST", "/api/leads/bulk/stage", { ids: selectedIds, stage: bulkStage });
      toast.success(`${selectedIds.length} leads moved to ${STAGE_LABELS[bulkStage]}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      onClear();
    } catch {
      toast.error("Bulk stage change failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <span className="text-sm font-medium text-blue-700">
        {selectedIds.length} selected
      </span>

      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-gray-500" />
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Assign to...</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={handleBulkAssign} disabled={!assignTo || processing}>
          Assign
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4 text-gray-500" />
        <select
          value={bulkStage}
          onChange={(e) => setBulkStage(e.target.value)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Move to stage...</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={handleBulkStage} disabled={!bulkStage || processing}>
          Move
        </Button>
      </div>

      <button onClick={onClear} className="ml-auto rounded p-1 text-gray-400 hover:text-gray-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────

function KanbanView({ leads }: { leads: any[] }) {
  const updateStage = useUpdateLeadStage();
  const byStage = STAGES.reduce<Record<string, any[]>>((acc, s) => {
    acc[s] = leads.filter((l) => l.stage === s);
    return acc;
  }, {});

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div key={stage} className="flex w-64 shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50">
          {/* Column header */}
          <div className={`flex items-center justify-between rounded-t-xl px-3 py-2.5 ${STAGE_COLORS[stage]}`}>
            <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
            <span className="text-xs font-medium opacity-70">{byStage[stage]?.length ?? 0}</span>
          </div>
          {/* Cards */}
          <div className="flex flex-col gap-2 overflow-y-auto p-2 max-h-[calc(100vh-280px)]">
            {(byStage[stage] ?? []).map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <a className="block rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{lead.phone}</p>
                  {lead.course_name && <p className="mt-1 text-xs text-blue-600">{lead.course_name}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{lead.assigned_to_name ?? "Unassigned"}</span>
                    <span className={`text-xs font-semibold ${getScoreLabel(lead.lead_score).color}`}>
                      {lead.lead_score}
                    </span>
                  </div>
                </a>
              </Link>
            ))}
            {(byStage[stage]?.length ?? 0) === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">Empty</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── New Lead Dialog ──────────────────────────────────────────

function NewLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createLead = useCreateLead();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  const onSubmit = async (data: any) => {
    try {
      await createLead.mutateAsync(data);
      toast.success("Lead created");
      reset();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">Full Name *</label>
              <Input {...register("fullName", { required: "Name is required" })} placeholder="John Doe" />
              {errors.fullName && <p className="mt-0.5 text-xs text-red-500">{errors.fullName.message as string}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Phone *</label>
              <Input {...register("phone", { required: "Phone is required", minLength: { value: 10, message: "Min 10 digits" } })} placeholder="9876543210" />
              {errors.phone && <p className="mt-0.5 text-xs text-red-500">{errors.phone.message as string}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
              <Input {...register("email")} type="email" placeholder="john@email.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
              <Input {...register("city")} placeholder="Chennai" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Source *</label>
              <select {...register("source", { required: true })}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="manual">Manual Entry</option>
                <option value="walk_in">Walk-In</option>
                <option value="phone">Phone Call</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? "Creating…" : "Create Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

