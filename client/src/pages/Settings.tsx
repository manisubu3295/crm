import { useState } from "react";
import { Plus, Pencil, Check, X, Eye, EyeOff, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { apiRequest } from "../lib/queryClient.js";
import { useAuth } from "../lib/auth.js";
import { usePushNotifications } from "../hooks/usePushNotifications.js";

// ─── Settings Page ────────────────────────────────────────────

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <AppShell title="Settings">
      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="courses">Courses</TabsTrigger>}
          {isAdmin && <TabsTrigger value="sla">SLA Policies</TabsTrigger>}
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="users">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="courses">
          <CoursesSettings />
        </TabsContent>
        <TabsContent value="sla">
          <SlaSettings />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

// ─── General Tab ──────────────────────────────────────────────

function GeneralSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiRequest<{ ok: true; data: Record<string, string> }>("GET", "/api/admin/settings"),
  });

  const settings = data?.data ?? {};
  const [form, setForm] = useState<Record<string, string>>({});
  const dirty = Object.keys(form).length > 0;

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/settings", form),
    onSuccess: () => {
      toast.success("Settings saved");
      setForm({});
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const val = (key: string) => form[key] ?? settings[key] ?? "";
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const TIMEZONES = [
    "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
    "Europe/London", "Europe/Paris", "America/New_York", "America/Chicago",
    "America/Denver", "America/Los_Angeles", "UTC",
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Institution Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Institution Name">
            <Input value={val("institution_name")} onChange={(e) => set("institution_name", e.target.value)}
              placeholder="e.g. Aadhirai Academy" />
          </Field>
          <Field label="Lead Number Prefix">
            <Input value={val("lead_no_prefix")} onChange={(e) => set("lead_no_prefix", e.target.value)}
              placeholder="e.g. ACA" maxLength={5} />
            <p className="mt-1 text-xs text-gray-400">Generates lead IDs like ACA-2025-0001</p>
          </Field>
          <Field label="Timezone">
            <select
              value={val("timezone")}
              onChange={(e) => set("timezone", e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
          <Field label="Support Email">
            <Input value={val("support_email")} onChange={(e) => set("support_email", e.target.value)}
              type="email" placeholder="support@yourschool.com" />
          </Field>
        </CardContent>
      </Card>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      )}

      <PushNotificationCard />
    </div>
  );
}

function PushNotificationCard() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Push Notifications</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {subscribed ? "Notifications enabled" : "Enable push notifications"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {subscribed
                ? "You will receive browser notifications for new leads, tasks, and SLA breaches"
                : "Get notified even when the CRM tab is in the background"}
            </p>
          </div>
          <Button
            variant={subscribed ? "outline" : "default"}
            size="sm"
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={loading}
          >
            {subscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {loading ? "..." : subscribed ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Users Tab ────────────────────────────────────────────────

function UsersSettings() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/admin/users"),
  });

  const users = data?.data ?? [];

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: () => toast.error("Failed to update user"),
  });

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    counsellor: "bg-green-100 text-green-700",
    viewer: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{users.length} users</p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              {["Name", "Username", "Role", "Phone", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.full_name}</p>
                  <p className="text-xs text-gray-400">{u.email ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.is_active ? "text-green-600" : "text-gray-400"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(u)} className="rounded p-1 text-gray-400 hover:text-blue-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.is_active })}
                      className={`rounded p-1 ${u.is_active ? "text-gray-400 hover:text-red-500" : "text-gray-400 hover:text-green-500"}`}
                    >
                      {u.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editing) && (
        <UserFormDialog
          user={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function UserFormDialog({ user, onClose }: { user?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username ?? "",
    fullName: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: user?.role ?? "counsellor",
    password: "",
  });

  const save = useMutation({
    mutationFn: () => isEdit
      ? apiRequest("PATCH", `/api/admin/users/${user.id}`, { fullName: form.fullName, email: form.email, phone: form.phone, role: form.role, ...(form.password ? { password: form.password } : {}) })
      : apiRequest("POST", "/api/admin/users", form),
    onSuccess: () => {
      toast.success(isEdit ? "User updated" : "User created");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    },
    onError: () => toast.error("Failed to save user"),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">{isEdit ? "Edit User" : "Add User"}</h3>
        <div className="space-y-3">
          {!isEdit && (
            <Field label="Username *">
              <Input value={form.username} onChange={f("username")} placeholder="john.doe" />
            </Field>
          )}
          <Field label="Full Name *">
            <Input value={form.fullName} onChange={f("fullName")} placeholder="John Doe" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input value={form.email} onChange={f("email")} type="email" placeholder="john@school.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={f("phone")} placeholder="9876543210" />
            </Field>
          </div>
          <Field label="Role">
            <select value={form.role} onChange={f("role")}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["admin","manager","counsellor","viewer"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label={isEdit ? "New Password (leave blank to keep)" : "Password *"}>
            <Input value={form.password} onChange={f("password")} type="password" placeholder="Min 8 chars" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────

function CoursesSettings() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/admin/courses"),
  });

  const courses = data?.data ?? [];

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/courses/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-courses"] }),
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{courses.length} courses</p>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              {["Course Name", "Duration", "Fee (₹)", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No courses yet</td></tr>
            )}
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  {c.description && <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.duration ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.fee ? `₹${Number(c.fee).toLocaleString("en-IN")}` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${c.is_active ? "text-green-600" : "text-gray-400"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(c)} className="rounded p-1 text-gray-400 hover:text-blue-600">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: c.id, isActive: !c.is_active })}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      {c.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editing) && (
        <CourseFormDialog course={editing} onClose={() => { setShowAdd(false); setEditing(null); }} />
      )}
    </div>
  );
}

function CourseFormDialog({ course, onClose }: { course?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!course;
  const [form, setForm] = useState({
    name: course?.name ?? "",
    description: course?.description ?? "",
    duration: course?.duration ?? "",
    fee: course?.fee ?? "",
  });

  const save = useMutation({
    mutationFn: () => isEdit
      ? apiRequest("PATCH", `/api/admin/courses/${course.id}`, { ...form, fee: form.fee ? Number(form.fee) : undefined })
      : apiRequest("POST", "/api/admin/courses", { ...form, fee: form.fee ? Number(form.fee) : undefined }),
    onSuccess: () => {
      toast.success(isEdit ? "Course updated" : "Course created");
      qc.invalidateQueries({ queryKey: ["admin-courses"] });
      onClose();
    },
    onError: () => toast.error("Failed to save course"),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">{isEdit ? "Edit Course" : "Add Course"}</h3>
        <div className="space-y-3">
          <Field label="Course Name *">
            <Input value={form.name} onChange={f("name")} placeholder="Full Stack Development" />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={f("description")}
              className="flex min-h-[72px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief course description" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration">
              <Input value={form.duration} onChange={f("duration")} placeholder="6 months" />
            </Field>
            <Field label="Fee (₹)">
              <Input value={form.fee} onChange={f("fee")} type="number" placeholder="25000" />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── SLA Tab ──────────────────────────────────────────────────

function SlaSettings() {
  const qc = useQueryClient();
  const { data: slaData } = useQuery({
    queryKey: ["admin-sla"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/admin/sla-policies"),
  });
  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/admin/users"),
  });

  const policies = slaData?.data ?? [];
  const users = usersData?.data ?? [];
  const [edits, setEdits] = useState<Record<string, { maxResponseHours?: number; escalateTo?: string }>>({});

  const save = useMutation({
    mutationFn: async () => {
      for (const [id, patch] of Object.entries(edits)) {
        await apiRequest("PATCH", `/api/admin/sla-policies/${id}`, patch);
      }
    },
    onSuccess: () => {
      toast.success("SLA policies saved");
      setEdits({});
      qc.invalidateQueries({ queryKey: ["admin-sla"] });
    },
    onError: () => toast.error("Failed to save SLA policies"),
  });

  const setEdit = (id: string, key: string, value: unknown) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], [key]: value } }));

  const STAGE_LABELS: Record<string, string> = {
    new: "New", contacted: "Contacted", qualified: "Qualified", demo: "Demo",
    interested: "Interested", payment: "Payment", admitted: "Admitted", lost: "Lost",
  };

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-gray-500">Set maximum response time and escalation contact per pipeline stage.</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              {["Stage", "Max Response Hours", "Escalate To"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => {
              const edit = edits[p.id];
              const hrs = edit?.maxResponseHours ?? p.max_response_hours;
              const esc = edit?.escalateTo !== undefined ? edit.escalateTo : (p.escalate_to ?? "");
              return (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-800">{STAGE_LABELS[p.stage] ?? p.stage}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={hrs ?? ""}
                      onChange={(e) => setEdit(p.id, "maxResponseHours", Number(e.target.value))}
                      className="w-24"
                      min={1}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={esc}
                      onChange={(e) => setEdit(p.id, "escalateTo", e.target.value || null)}
                      className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {users.filter((u) => u.role === "manager" || u.role === "admin").map((u: any) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(edits).length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save SLA Policies"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────

function IntegrationsSettings() {
  const tenantId = localStorage.getItem("crm_tenant") ?? "";

  const integrations = [
    {
      name: "Meta / Facebook Ads",
      icon: "📘",
      status: "configured",
      description: "Receives leads from Meta Lead Ads via webhook",
      detail: `Webhook URL: /api/webhooks/meta\nVerify Token: set in env META_VERIFY_TOKEN`,
    },
    {
      name: "WhatsApp (Meta Cloud API)",
      icon: "💬",
      status: "configured",
      description: "Sends WhatsApp messages and receives delivery receipts",
      detail: "Phone Number ID and Access Token set in server environment",
    },
    {
      name: "SMS — Msg91",
      icon: "📱",
      status: "configured",
      description: "Sends OTP and transactional SMS messages",
      detail: "Auth Key set in env MSG91_AUTH_KEY",
    },
    {
      name: "IVR — Exotel",
      icon: "📞",
      status: "configured",
      description: "Automated IVR calls for lead follow-up",
      detail: "API Key and SID set in server environment",
    },
    {
      name: "Email — SendGrid",
      icon: "📧",
      status: "configured",
      description: "Transactional email delivery",
      detail: "API Key set in env SENDGRID_API_KEY",
    },
    {
      name: "Website Webhook",
      icon: "🌐",
      status: "active",
      description: "Accepts leads from your website contact form",
      detail: `POST https://yourapp.com/api/webhooks/website/${tenantId}\n\nPayload: { fullName, phone, email, courseInterest, source }`,
    },
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-gray-500">All integrations are configured via server environment variables. Contact your system administrator to update credentials.</p>

      {integrations.map((intg) => (
        <Card key={intg.name}>
          <CardContent className="flex items-start gap-4 pt-4 pb-4">
            <span className="mt-1 text-2xl">{intg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{intg.name}</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  {intg.status}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">{intg.description}</p>
              <pre className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap break-all">
                {intg.detail}
              </pre>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
