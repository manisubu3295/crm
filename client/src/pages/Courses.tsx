import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Plus, Search, Users, Layers, GraduationCap,
  IndianRupee, Edit2, Archive, ArchiveRestore, Trash2, Award,
  Clock, Tag, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { Label } from "../components/ui/label.js";
import { Textarea } from "../components/ui/textarea.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Switch } from "../components/ui/switch.js";
import { Separator } from "../components/ui/separator.js";
import { apiRequest } from "../lib/queryClient.js";

const CATEGORIES = ["IT & Software", "Finance & Accounting", "Healthcare", "Digital Marketing", "Design", "HR & Management", "Language", "Engineering", "Other"];

const fmt = (n: unknown) => parseFloat(String(n ?? 0)).toLocaleString("en-IN");

export function CoursesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: statsData } = useQuery<any>({
    queryKey: ["courses-stats"],
    queryFn: () => apiRequest<any>("GET", "/api/admin/courses/stats"),
    staleTime: 60_000,
  });
  const stats = statsData?.data;

  const { data: listData, isLoading } = useQuery<any>({
    queryKey: ["courses"],
    queryFn: () => apiRequest<any>("GET", "/api/admin/courses"),
    staleTime: 30_000,
  });
  const all: any[] = listData?.data ?? [];
  const courses = all
    .filter((c) => showArchived ? !c.is_active : c.is_active)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>("POST", "/api/admin/courses", body),
    onSuccess: () => { toast.success("Course created"); setShowNew(false); qc.invalidateQueries({ queryKey: ["courses"] }); qc.invalidateQueries({ queryKey: ["courses-stats"] }); },
    onError: () => toast.error("Failed to create course"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: any) => apiRequest<any>("PATCH", `/api/admin/courses/${id}`, body),
    onSuccess: () => { toast.success("Course updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["courses"] }); qc.invalidateQueries({ queryKey: ["courses-stats"] }); },
    onError: () => toast.error("Failed to update course"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest<any>("DELETE", `/api/admin/courses/${id}`),
    onSuccess: (d: any) => {
      toast.success(d.archived ? "Course archived (has linked data)" : "Course deleted");
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["courses-stats"] });
    },
    onError: () => toast.error("Failed to delete course"),
  });

  return (
    <AppShell title="Course Management">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Total Courses",   value: stats?.total_courses   ?? "—", icon: BookOpen,       color: "text-indigo-600",  bg: "bg-indigo-50" },
          { label: "Active",          value: stats?.active_courses  ?? "—", icon: CheckCircle,    color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Batches",   value: stats?.total_batches   ?? "—", icon: Layers,         color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Total Students",  value: stats?.total_enrollments ?? "—", icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Revenue Collected", value: `₹${fmt(stats?.total_revenue)}`, icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`shrink-0 rounded-xl p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search courses…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
        </label>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /> New Course</Button>
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : courses.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <BookOpen className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>{showArchived ? "No archived courses." : "No courses yet. Add your first course."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={() => setEditing(c)}
              onToggle={() => updateMutation.mutate({ id: c.id, isActive: !c.is_active })}
              onDelete={() => deleteMutation.mutate(c.id)}
            />
          ))}
        </div>
      )}

      {showNew && (
        <CourseDialog
          title="New Course"
          onClose={() => setShowNew(false)}
          onSave={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {editing && (
        <CourseDialog
          title="Edit Course"
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(d) => updateMutation.mutate({ id: editing.id, ...d })}
          loading={updateMutation.isPending}
        />
      )}
    </AppShell>
  );
}

// ─── Course Card ───────────────────────────────────────────────
function CourseCard({ course: c, onEdit, onToggle, onDelete }: {
  course: any; onEdit: () => void; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${!c.is_active ? "opacity-60" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm truncate">{c.name}</h3>
              {!c.is_active && <Badge className="bg-gray-100 text-gray-500 text-[10px] shrink-0">Archived</Badge>}
            </div>
            {c.category && (
              <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-indigo-600 font-medium">
                <Tag className="h-3 w-3" />{c.category}
              </span>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onToggle} title={c.is_active ? "Archive" : "Restore"}>
              {c.is_active ? <Archive className="h-3.5 w-3.5 text-amber-500" /> : <ArchiveRestore className="h-3.5 w-3.5 text-emerald-500" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
          </div>
        </div>

        {c.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          {c.fee && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold">₹{fmt(c.fee)}</span>
            </div>
          )}
          {c.duration && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>{c.duration}</span>
            </div>
          )}
          {c.certificate_offered && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Award className="h-3.5 w-3.5 text-violet-500" />
              <span>Certificate</span>
            </div>
          )}
        </div>

        <Separator className="mb-3" />

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /><strong className="text-gray-700">{c.lead_count ?? 0}</strong> leads</span>
          <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /><strong className="text-gray-700">{c.batch_count ?? 0}</strong> batches</span>
          <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /><strong className="text-gray-700">{c.enrollment_count ?? 0}</strong> enrolled</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Course Dialog ─────────────────────────────────────────────
type CourseForm = {
  name: string; category: string; fee: string; duration: string;
  description: string; syllabus: string; certificate_offered: boolean; sort_order: string;
};

function CourseDialog({ title, initial, onClose, onSave, loading }: {
  title: string; initial?: any; onClose: () => void; onSave: (d: any) => void; loading: boolean;
}) {
  const [f, setF] = useState<CourseForm>({
    name:                 initial?.name ?? "",
    category:             initial?.category ?? "",
    fee:                  initial?.fee ?? "",
    duration:             initial?.duration ?? "",
    description:          initial?.description ?? "",
    syllabus:             initial?.syllabus ?? "",
    certificate_offered:  initial?.certificate_offered ?? true,
    sort_order:           String(initial?.sort_order ?? "0"),
  });
  const set = (k: keyof CourseForm, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  function handleSave() {
    onSave({
      name:                f.name,
      category:            f.category || null,
      fee:                 f.fee ? parseFloat(f.fee) : null,
      duration:            f.duration || null,
      description:         f.description || null,
      syllabus:            f.syllabus || null,
      certificate_offered: f.certificate_offered,
      sort_order:          parseInt(f.sort_order) || 0,
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {/* Row 1: Name */}
          <div>
            <Label>Course Name *</Label>
            <Input className="mt-1" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tally ERP 9 with GST" />
          </div>

          {/* Row 2: Category + Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={f.category || "none"} onValueChange={(v) => set("category", v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Course Fee (₹)</Label>
              <Input className="mt-1" type="number" min="0" step="100" value={f.fee} onChange={(e) => set("fee", e.target.value)} placeholder="15000" />
            </div>
          </div>

          {/* Row 3: Duration + Sort Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration</Label>
              <Input className="mt-1" value={f.duration} onChange={(e) => set("duration", e.target.value)} placeholder="3 months / 45 hrs" />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input className="mt-1" type="number" min="0" value={f.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Short Description</Label>
            <Textarea className="mt-1" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief overview of the course…" />
          </div>

          {/* Syllabus */}
          <div>
            <Label>Syllabus / Topics Covered</Label>
            <Textarea className="mt-1" rows={4} value={f.syllabus} onChange={(e) => set("syllabus", e.target.value)} placeholder="Module 1: …&#10;Module 2: …" />
          </div>

          {/* Certificate Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Certificate Offered</p>
              <p className="text-xs text-gray-500">Students receive a certificate on completion</p>
            </div>
            <Switch checked={f.certificate_offered} onCheckedChange={(v) => set("certificate_offered", v)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={loading || !f.name.trim()} onClick={handleSave}>
            {loading ? "Saving…" : title === "New Course" ? "Create Course" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
