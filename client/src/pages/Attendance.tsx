import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, MinusCircle, Award, LayoutGrid, Filter } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

type AttStatus = "present" | "absent" | "late" | "excused";

const STATUS_META: Record<AttStatus, { label: string; color: string; headerColor: string; icon: React.ComponentType<{className?:string}> }> = {
  present: { label: "Present", color: "bg-green-100 text-green-700", headerColor: "border-green-500", icon: CheckCircle },
  absent:  { label: "Absent",  color: "bg-red-100 text-red-600",   headerColor: "border-red-500",   icon: XCircle },
  late:    { label: "Late",    color: "bg-amber-100 text-amber-700", headerColor: "border-amber-500", icon: Clock },
  excused: { label: "Excused", color: "bg-gray-100 text-gray-600",  headerColor: "border-gray-400",  icon: MinusCircle },
};

const TODAY = new Date().toISOString().slice(0, 10);

export function AttendancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"attendance"|"certificates">("attendance");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [date, setDate] = useState(TODAY);
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [showCertDialog, setShowCertDialog] = useState<any>(null);

  const { data: batchesData } = useQuery<any>({
    queryKey: ["batches", ""],
    queryFn: () => apiRequest<any>("GET", "/api/batches?limit=100"),
  });
  const batches: any[] = batchesData?.data ?? [];

  const { data: rollData, isLoading: rollLoading, refetch: refetchRoll } = useQuery<any>({
    queryKey: ["attendance-roll", selectedBatch, date],
    queryFn: () => apiRequest<any>("GET", `/api/attendance/batch/${selectedBatch}/summary?date=${date}`),
    enabled: !!selectedBatch,
  });
  const roll: any[] = rollData?.data?.roll ?? [];

  useEffect(() => {
    if (!rollData) return;
    const map: Record<string, AttStatus> = {};
    (rollData?.data?.roll ?? []).forEach((s: any) => { if (s.status) map[s.enrollment_id] = s.status; });
    setAttendance(map);
  }, [rollData]);

  const saveMutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>("POST", "/api/attendance", body),
    onSuccess: () => { toast.success("Attendance saved"); refetchRoll(); },
    onError: () => toast.error("Failed to save attendance"),
  });

  function markAll(status: AttStatus) {
    const map: Record<string, AttStatus> = {};
    roll.forEach((s) => { map[s.enrollment_id] = status; });
    setAttendance(map);
  }

  function handleSave() {
    const records = roll.map((s) => ({ enrollment_id: s.enrollment_id, status: attendance[s.enrollment_id] ?? "absent" }));
    saveMutation.mutate({ batch_id: selectedBatch, date, records });
  }

  const presentCount = Object.values(attendance).filter((v) => v === "present" || v === "late").length;
  const absentCount  = Object.values(attendance).filter((v) => v === "absent").length;

  // Certificates tab data
  const { data: certData } = useQuery({
    queryKey: ["certificates", selectedBatch],
    queryFn: () => apiRequest<any>("GET", `/api/attendance/certificates/list?batchId=${selectedBatch}`),
    enabled: !!selectedBatch && tab === "certificates",
  });
  const certs: any[] = certData?.data ?? [];

  const issueCertMutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>("POST", "/api/attendance/certificates", body),
    onSuccess: () => { toast.success("Certificate issued"); qc.invalidateQueries({ queryKey: ["certificates", selectedBatch] }); setShowCertDialog(null); },
    onError: () => toast.error("Failed to issue certificate"),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => apiRequest<any>("PATCH", `/api/attendance/certificates/${id}/dispatch`, {}),
    onSuccess: () => { toast.success("Marked dispatched"); qc.invalidateQueries({ queryKey: ["certificates", selectedBatch] }); },
  });

  return (
    <AppShell title="Attendance & Certificates">
      {/* Batch + Date controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={selectedBatch || "none"} onValueChange={(v) => setSelectedBatch(v === "none" ? "" : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select batch…" /></SelectTrigger>
          <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.course_name})</SelectItem>)}</SelectContent>
        </Select>
        {tab === "attendance" && (
          <Input type="date" className="w-40" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </div>

      {!selectedBatch ? (
        <div className="py-20 text-center text-gray-400">
          <LayoutGrid className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>Select a batch to get started</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-5">
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* ── Attendance Tab ── */}
          <TabsContent value="attendance">
            {roll.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">Quick mark all:</span>
                {(["present","absent","late","excused"] as AttStatus[]).map((s) => (
                  <Button key={s} size="sm" variant="outline" className="text-xs" onClick={() => markAll(s)}>
                    All {STATUS_META[s].label}
                  </Button>
                ))}
                <div className="ml-auto flex items-center gap-3 text-sm">
                  <span className="text-green-600 font-semibold">✓ {presentCount} present</span>
                  <span className="text-red-500 font-semibold">✗ {absentCount} absent</span>
                  <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || roll.length === 0}>
                    {saveMutation.isPending ? "Saving…" : "Save Attendance"}
                  </Button>
                </div>
              </div>
            )}

            {rollLoading ? (
              <div className="py-10 text-center text-gray-400">Loading roll…</div>
            ) : roll.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <p>No students enrolled in this batch yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Student</th>
                      {(["present","absent","late","excused"] as AttStatus[]).map((s) => (
                        <th key={s} className="px-2 py-3 text-xs font-semibold text-gray-500">{STATUS_META[s].label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {roll.map((s, idx) => {
                      const cur = attendance[s.enrollment_id];
                      return (
                        <tr key={s.enrollment_id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {s.student_name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{s.student_name}</p>
                                <p className="text-xs text-gray-400">{s.student_phone}</p>
                              </div>
                            </div>
                          </td>
                          {(["present","absent","late","excused"] as AttStatus[]).map((st) => (
                            <td key={st} className="px-2 py-3 text-center">
                              <button onClick={() => setAttendance((p) => ({ ...p, [s.enrollment_id]: st }))}
                                className={`h-7 w-7 rounded-full border-2 transition-all ${cur === st ? `${STATUS_META[st].headerColor} ${STATUS_META[st].color.replace("bg-","border-")} ring-2 ring-offset-1` : "border-gray-200 hover:border-gray-400"}`}>
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Certificates Tab ── */}
          <TabsContent value="certificates">
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setShowCertDialog({})}>
                <Award className="h-3.5 w-3.5" /> Issue Certificate
              </Button>
            </div>
            {certs.length === 0 ? (
              <div className="py-14 text-center text-gray-400">
                <Award className="mx-auto h-10 w-10 text-gray-200 mb-2" />
                <p>No certificates issued for this batch yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{["Cert #","Student","Course","Issued","Dispatched",""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {certs.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700">{c.cert_no}</td>
                        <td className="px-4 py-3 font-medium">{c.student_name}</td>
                        <td className="px-4 py-3 text-gray-600">{c.course_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(c.issued_at)}</td>
                        <td className="px-4 py-3">
                          {c.dispatched_at ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">Dispatched {formatDate(c.dispatched_at)}</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-600 text-[10px]">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!c.dispatched_at && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => dispatchMutation.mutate({ id: c.id })}>
                              Mark Dispatched
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showCertDialog !== null && (
              <IssueCertDialog
                batchId={selectedBatch}
                batches={batches}
                onClose={() => setShowCertDialog(null)}
                onSave={(d) => issueCertMutation.mutate(d)}
                loading={issueCertMutation.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

// ─── Issue Certificate Dialog ─────────────────────────────────
function IssueCertDialog({ batchId, batches, onClose, onSave, loading }: {
  batchId: string; batches: any[]; onClose: () => void; onSave: (d: any) => void; loading: boolean;
}) {
  const [enrollId, setEnrollId] = useState("");
  const [courseName, setCourseName] = useState(() => batches.find((b) => b.id === batchId)?.course_name ?? "");

  const { data } = useQuery({
    queryKey: ["batch-enrollments", batchId],
    queryFn: () => apiRequest<any>("GET", `/api/batches/${batchId}/enrollments`),
    enabled: !!batchId,
  });
  const enrollments: any[] = data?.data?.enrollments ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Student (Enrollment)</Label>
            <Select value={enrollId || "none"} onValueChange={(v) => setEnrollId(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>{enrollments.map((e) => <SelectItem key={e.id} value={e.id}>{e.student_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Course Name on Certificate</Label><Input className="mt-1" value={courseName} onChange={(e) => setCourseName(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!enrollId || !courseName || loading}
            onClick={() => { const e = enrollments.find((x) => x.id === enrollId); onSave({ lead_id: e?.lead_id, enrollment_id: enrollId, course_name: courseName }); }}>
            {loading ? "Issuing…" : "Issue Certificate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
