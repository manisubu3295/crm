import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Plus, Users, Calendar, Clock, AlertTriangle,
  ChevronRight, Search, LayoutList, Trash2, Award,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Progress } from "../components/ui/progress.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

function seatColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

const BATCH_TYPE_LABELS: Record<string, string> = {
  regular: "Regular", weekend: "Weekend", fast_track: "Fast Track", online: "Online",
};
const MODE_LABELS: Record<string, string> = { offline: "Offline", online: "Online", hybrid: "Hybrid" };

export function BatchesPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedBatch,   setSelectedBatch]   = useState<any>(null);
  const [timetableBatch, setTimetableBatch] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  const { data: coursesData } = useQuery({ queryKey: ["courses"], queryFn: () => apiRequest<any>("GET", "/api/admin/courses") });
  const courses: any[] = coursesData?.data ?? [];

  const { data: listData, isLoading } = useQuery({
    queryKey: ["batches", courseFilter],
    queryFn: () => apiRequest<any>("GET", `/api/batches?limit=100${courseFilter ? `&courseId=${courseFilter}` : ""}`),
    staleTime: 30_000,
  });
  const batches: any[] = listData?.data ?? [];
  const filtered = search ? batches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.course_name?.toLowerCase().includes(search.toLowerCase())) : batches;

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", "/api/batches", body),
    onSuccess: () => { toast.success("Batch created"); setShowNew(false); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: () => toast.error("Failed to create batch"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => apiRequest<any>("PATCH", `/api/batches/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["batches"] }),
  });

  return (
    <AppShell title="Batches & Enrollment">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search batches…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={courseFilter || "all"} onValueChange={(v) => setCourseFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Batch</Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <BookOpen className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>No batches found. Create your first batch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => {
            const enrolled = parseInt(b.enrolled_count ?? 0);
            const capacity = parseInt(b.capacity ?? 1);
            const pct = Math.round((enrolled / capacity) * 100);
            const seatsLeft = parseInt(b.seats_left ?? capacity - enrolled);
            return (
              <Card key={b.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm">{b.name}</p>
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">{b.course_name}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge className={`text-[10px] ${b.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {b.is_active ? "Active" : "Closed"}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">{BATCH_TYPE_LABELS[b.batch_type] ?? b.batch_type}</Badge>
                    </div>
                  </div>

                  {/* Seat fill bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{enrolled} / {capacity} enrolled</span>
                      <span className={`font-semibold ${seatsLeft <= 3 ? "text-red-600" : seatsLeft <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {seatsLeft <= 0 ? "FULL" : `${seatsLeft} seats left`}
                        {seatsLeft <= 3 && seatsLeft > 0 && " ⚠️"}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                    {b.timing && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.timing}</span>}
                    {b.mode   && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{MODE_LABELS[b.mode]}</span>}
                    {b.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Starts {formatDate(b.start_date)}</span>}
                    {b.end_date   && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Ends {formatDate(b.end_date)}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setSelectedBatch(b)}>
                      <Users className="h-3.5 w-3.5" /> Students
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setTimetableBatch(b)}>
                      <LayoutList className="h-3.5 w-3.5" /> Timetable
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs"
                      onClick={() => toggleActive.mutate({ id: b.id, is_active: !b.is_active })}>
                      {b.is_active ? "Close" : "Reopen"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showNew && (
        <BatchFormDialog
          courses={courses}
          onClose={() => setShowNew(false)}
          onSave={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {selectedBatch && <BatchEnrollmentDialog batch={selectedBatch} onClose={() => setSelectedBatch(null)} />}
      {timetableBatch && <TimetableDialog batch={timetableBatch} onClose={() => setTimetableBatch(null)} />}
    </AppShell>
  );
}

// ─── Enrollment Dialog ────────────────────────────────────────
function BatchEnrollmentDialog({ batch, onClose }: { batch: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [showEnroll, setShowEnroll] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["batch-enrollments", batch.id],
    queryFn: () => apiRequest<any>("GET", `/api/batches/${batch.id}/enrollments`),
  });
  const enrollments: any[] = data?.data?.enrollments ?? [];

  const { data: leadsData } = useQuery({
    queryKey: ["leads-search", leadSearch],
    queryFn: () => apiRequest<any>("GET", `/api/leads?search=${encodeURIComponent(leadSearch)}&limit=10`),
    enabled: leadSearch.length > 1,
  });
  const leads: any[] = leadsData?.data ?? [];

  const enrollMutation = useMutation({
    mutationFn: ({ lead_id }: any) => apiRequest<any>("POST", `/api/batches/${batch.id}/enroll`, { lead_id }),
    onSuccess: () => { toast.success("Student enrolled"); setShowEnroll(false); setSelectedLead(null); qc.invalidateQueries({ queryKey: ["batch-enrollments", batch.id] }); qc.invalidateQueries({ queryKey: ["batches"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Enrollment failed"),
  });

  const certMutation = useMutation({
    mutationFn: (enrollmentId: string) => apiRequest<any>("POST", `/api/batches/enrollments/${enrollmentId}/issue-cert`),
    onSuccess: () => { toast.success("Certificate issued & WhatsApp sent!"); qc.invalidateQueries({ queryKey: ["batch-enrollments", batch.id] }); },
    onError: () => toast.error("Certificate issue failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch.name} — Students</DialogTitle>
        </DialogHeader>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-500">{enrollments.length} / {batch.capacity} enrolled</p>
          <Button size="sm" onClick={() => setShowEnroll(true)}><Plus className="h-3.5 w-3.5" /> Enroll Student</Button>
        </div>

        {showEnroll && (
          <div className="mb-4 rounded-lg border p-4 bg-gray-50">
            <p className="text-sm font-medium mb-2">Search & Enroll Student</p>
            {selectedLead ? (
              <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedLead.full_name}</p>
                  <p className="text-xs text-gray-500">{selectedLead.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => enrollMutation.mutate({ lead_id: selectedLead.id })} disabled={enrollMutation.isPending}>
                    {enrollMutation.isPending ? "…" : "Enroll"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedLead(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Input placeholder="Type name or phone…" value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} />
                {leads.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-40 overflow-y-auto">
                    {leads.map((l) => (
                      <button key={l.id} onClick={() => { setSelectedLead(l); setLeadSearch(""); }}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0">
                        <span className="text-sm font-medium">{l.full_name}</span>
                        <span className="text-xs text-gray-500">{l.phone} · {l.stage}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="py-8 text-center text-gray-400"><Users className="mx-auto h-8 w-8 text-gray-200 mb-2" /><p>No students enrolled yet</p></div>
        ) : (
          <div className="divide-y rounded-lg border overflow-hidden">
            {enrollments.map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50/50">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                  {e.student_name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.student_name}</p>
                  <p className="text-xs text-gray-500">{e.student_phone} · Enrolled {formatDate(e.enrolled_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {parseFloat(e.fee_amount) > 0 && (
                      <p className="text-xs font-semibold text-emerald-700">
                        ₹{parseFloat(e.fee_paid ?? 0).toLocaleString("en-IN")} / ₹{parseFloat(e.fee_amount).toLocaleString("en-IN")}
                      </p>
                    )}
                    {e.cert_no && <p className="text-[10px] text-gray-400">{e.cert_no}</p>}
                  </div>
                  {e.certificate_issued
                    ? <Badge className="bg-green-100 text-green-700 text-[10px] flex items-center gap-1"><Award className="h-3 w-3" /> Certified</Badge>
                    : (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                        onClick={() => certMutation.mutate(e.id)}
                        disabled={certMutation.isPending}>
                        <Award className="h-3 w-3" /> Issue Cert
                      </Button>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Form Dialog ────────────────────────────────────────
function BatchFormDialog({ courses, onClose, onSave, loading }: {
  courses: any[]; onClose: () => void; onSave: (d: Record<string, unknown>) => void; loading: boolean;
}) {
  const [f, setF] = useState({ course_id: "", name: "", batch_type: "regular", mode: "offline", timing: "", start_date: "", end_date: "", capacity: "30", notes: "" });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Batch</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Course *</Label>
            <Select value={f.course_id || "none"} onValueChange={(v) => set("course_id", v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Batch Name *</Label><Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Morning Batch Apr 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={f.batch_type} onValueChange={(v) => set("batch_type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BATCH_TYPE_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Mode</Label>
              <Select value={f.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MODE_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity</Label><Input className="mt-1" type="number" min="1" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} /></div>
            <div><Label>Timing</Label><Input className="mt-1" value={f.timing} onChange={(e) => set("timing", e.target.value)} placeholder="9AM - 12PM" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input className="mt-1" type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div><Label>End Date</Label><Input className="mt-1" type="date" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea className="mt-1" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...f, capacity: parseInt(f.capacity) })}
            disabled={loading || !f.course_id || !f.name}>{loading ? "Saving…" : "Create Batch"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Timetable Dialog ─────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TimetableDialog({ batch, onClose }: { batch: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ day_of_week: "1", start_time: "", end_time: "", topic: "", location: "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ["timetable", batch.id],
    queryFn: () => apiRequest<any>("GET", `/api/batches/${batch.id}/timetable`),
  });
  const sessions: any[] = data?.data ?? [];

  const grouped = DAYS.reduce<Record<number, any[]>>((acc, _, i) => {
    acc[i] = sessions.filter((s) => s.day_of_week === i);
    return acc;
  }, {} as Record<number, any[]>);

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest<any>("POST", `/api/batches/${batch.id}/timetable`, body),
    onSuccess: () => { toast.success("Session added"); qc.invalidateQueries({ queryKey: ["timetable", batch.id] }); setForm({ day_of_week: "1", start_time: "", end_time: "", topic: "", location: "" }); },
    onError: () => toast.error("Failed to add session"),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => apiRequest<any>("DELETE", `/api/batches/timetable/${sessionId}`),
    onSuccess: () => { toast.success("Session removed"); qc.invalidateQueries({ queryKey: ["timetable", batch.id] }); },
  });

  const handleAdd = () => {
    if (!form.start_time || !form.end_time) { toast.error("Start and end time required"); return; }
    addMutation.mutate({ ...form, day_of_week: parseInt(form.day_of_week) });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch.name} — Class Timetable</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-3 mb-4">
            {DAYS.map((day, i) => (
              grouped[i].length > 0 && (
                <div key={i} className="rounded-lg border overflow-hidden">
                  <div className="bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{day}</div>
                  {grouped[i].map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50 border-t first:border-t-0">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm font-mono">{s.start_time} – {s.end_time}</span>
                      {s.topic && <span className="text-sm text-gray-700 flex-1 truncate">{s.topic}</span>}
                      {s.location && <span className="text-xs text-gray-400 truncate max-w-[100px]">{s.location}</span>}
                      {s.trainer_name && <span className="text-xs text-indigo-600 truncate max-w-[100px]">{s.trainer_name}</span>}
                      <button onClick={() => deleteMutation.mutate(s.id)} className="ml-auto text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ))}
            {sessions.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <Calendar className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                <p>No sessions scheduled yet</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border p-4 bg-gray-50">
          <p className="text-sm font-medium mb-3">Add Session</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">Day</Label>
              <Select value={form.day_of_week} onValueChange={(v) => set("day_of_week", v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Topic</Label>
              <Input className="mt-1 h-8 text-xs" value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Module 1" />
            </div>
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input className="mt-1 h-8 text-xs" type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input className="mt-1 h-8 text-xs" type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Location / Room</Label>
              <Input className="mt-1 h-8 text-xs" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Room A / Zoom link" />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={addMutation.isPending}>
            <Plus className="h-3.5 w-3.5" /> {addMutation.isPending ? "Adding…" : "Add Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
