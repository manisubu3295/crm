import { z } from "zod";

// ─── API Response Envelope ───────────────────────────────────

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: { total: number; page: number; limit: number };
};

export type ApiError = {
  ok: false;
  code: string;
  message: string;
  details?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Auth ────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export type AuthResponse = {
  ok: true;
  token: string;
  tenantId: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    email?: string | null;
  };
};

// ─── JWT Payload ─────────────────────────────────────────────

export type JwtPayload = {
  sub: string;         // userId
  tenantId: string;
  role: "admin" | "manager" | "counsellor" | "viewer";
  iat: number;
  exp: number;
};

// ─── Lead Query Filters ──────────────────────────────────────

export const leadQuerySchema = z.object({
  stage: z
    .enum(["new", "contacted", "qualified", "demo", "interested", "payment", "admitted", "lost"])
    .optional(),
  source: z
    .enum(["meta_ads", "website", "manual", "excel_import", "walk_in", "phone", "referral"])
    .optional(),
  assignedTo: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  search: z.string().optional(),         // name / phone / email
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;

// ─── Task Query Filters ──────────────────────────────────────

export const taskQuerySchema = z.object({
  assignedTo: z.string().uuid().optional(),
  status: z.enum(["pending", "in_progress", "done", "overdue", "cancelled"]).optional(),
  dueToday: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;

// ─── Automation ──────────────────────────────────────────────

export type TriggerEvent =
  | "lead_created"
  | "lead_stage_changed"
  | "lead_assigned"
  | "no_response_24h"
  | "no_response_48h"
  | "demo_scheduled"
  | "demo_completed"
  | "payment_link_sent"
  | "payment_pending_24h"
  | "task_overdue"
  | "sla_breach"
  | "lead_re_entered_pipeline";

export type AutomationAction =
  | { type: "send_message"; channel: string; templateId?: string; body?: string; subject?: string }
  | { type: "assign_task"; taskType: string; title: string; dueHours: number; priority?: string }
  | { type: "escalate"; toUserId?: string; message?: string }
  | { type: "change_stage"; toStage: string }
  | { type: "reassign"; toUserId: string };

// ─── Communication Send Request ──────────────────────────────

export const sendMessageSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["whatsapp", "email", "sms", "ivr", "manual_call"]),
  templateId: z.string().uuid().optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  taskId: z.string().uuid().optional(),
});

export type SendMessagePayload = z.infer<typeof sendMessageSchema>;

// ─── Lead Score Breakdown ────────────────────────────────────

export type LeadScoreBreakdown = {
  sourceScore: number;
  responseScore: number;
  engagementScore: number;
  profileScore: number;
  stageScore: number;
  recencyScore: number;
  total: number;
  label: "cold" | "warm" | "hot" | "very_hot";
};

// ─── Real-time Socket Events ──────────────────────────────────

export type SocketEvent =
  | { event: "lead:created"; payload: { leadId: string; leadNo: string } }
  | { event: "lead:stage_changed"; payload: { leadId: string; from: string; to: string } }
  | { event: "lead:assigned"; payload: { leadId: string; toUserId: string } }
  | { event: "task:created"; payload: { taskId: string; leadId: string } }
  | { event: "task:overdue"; payload: { taskId: string; leadId: string } }
  | { event: "message:delivered"; payload: { leadId: string; messageId: string } }
  | { event: "message:replied"; payload: { leadId: string; messageId: string; body: string } }
  | { event: "sla:breached"; payload: { leadId: string; taskId?: string } }
  | { event: "notification"; payload: { type: string; message: string; severity: "info" | "warning" | "error" } };

// ─── Duplicate Detection Result ──────────────────────────────

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  matchedLeadId?: string;
  matchedLeadNo?: string;
  confidence: "exact_phone" | "exact_email" | "fuzzy_name" | "none";
};

// ─── Report Export Request ───────────────────────────────────

export const reportExportSchema = z.object({
  type: z.enum(["funnel", "counsellor", "campaign_roi", "conversion", "all_leads"]),
  format: z.enum(["pdf", "excel"]),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  counsellorId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
});

export type ReportExportPayload = z.infer<typeof reportExportSchema>;
