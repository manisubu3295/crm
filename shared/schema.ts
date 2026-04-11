import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  serial,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ──────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "counsellor",
  "viewer",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "meta_ads",
  "website",
  "manual",
  "excel_import",
  "walk_in",
  "phone",
  "referral",
]);

export const leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "qualified",
  "demo",
  "interested",
  "payment",
  "admitted",
  "lost",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "call",
  "whatsapp",
  "email",
  "sms",
  "meeting",
  "demo",
  "follow_up",
  "other",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
  "overdue",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const channelEnum = pgEnum("channel", [
  "whatsapp",
  "email",
  "sms",
  "ivr",
  "manual_call",
]);

export const commDirectionEnum = pgEnum("comm_direction", [
  "outbound",
  "inbound",
]);

export const commStatusEnum = pgEnum("comm_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "replied",
]);

export const campaignSourceEnum = pgEnum("campaign_source", [
  "meta_ads",
  "google_ads",
  "email",
  "sms",
  "referral",
  "organic",
  "other",
]);

export const automationStatusEnum = pgEnum("automation_exec_status", [
  "success",
  "failed",
  "skipped",
]);

// ─── Core ───────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").notNull().default("counsellor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Course Domain ───────────────────────────────────────────

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 50 }),
  fee: numeric("fee", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Campaign Domain ─────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  source: campaignSourceEnum("source").notNull(),
  metaCampaignId: varchar("meta_campaign_id", { length: 200 }),
  metaAdsetId: varchar("meta_adset_id", { length: 200 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const campaignStats = pgTable(
  "campaign_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    date: date("date").notNull(),
    leadsCount: integer("leads_count").notNull().default(0),
    contactedCount: integer("contacted_count").notNull().default(0),
    admittedCount: integer("admitted_count").notNull().default(0),
    spend: numeric("spend", { precision: 12, scale: 2 }),
    costPerLead: numeric("cost_per_lead", { precision: 10, scale: 2 }),
    costPerAdmission: numeric("cost_per_admission", {
      precision: 10,
      scale: 2,
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("idx_campaign_stats_campaign_date").on(t.campaignId, t.date)]
);

// ─── Lead Domain ─────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadNo: varchar("lead_no", { length: 30 }).unique(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 20 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 20 }),
    city: varchar("city", { length: 100 }),
    qualification: varchar("qualification", { length: 100 }),
    courseId: uuid("course_id").references(() => courses.id),
    source: leadSourceEnum("source").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    adId: varchar("ad_id", { length: 200 }),
    formId: varchar("form_id", { length: 200 }),
    stage: leadStageEnum("stage").notNull().default("new"),
    subStage: varchar("sub_stage", { length: 100 }),
    leadScore: integer("lead_score").notNull().default(0),
    assignedTo: uuid("assigned_to").references(() => users.id),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOf: uuid("duplicate_of"),
    lostReason: varchar("lost_reason", { length: 300 }),
    objectionNotes: text("objection_notes"),
    reEngagementEligible: boolean("re_engagement_eligible")
      .notNull()
      .default(true),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    admittedAt: timestamp("admitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_leads_phone").on(t.phone),
    index("idx_leads_email").on(t.email),
    index("idx_leads_stage").on(t.stage),
    index("idx_leads_assigned_to").on(t.assignedTo),
    index("idx_leads_campaign_id").on(t.campaignId),
    index("idx_leads_source").on(t.source),
    index("idx_leads_created_at").on(t.createdAt),
  ]
);

export const leadStageHistory = pgTable("lead_stage_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  fromStage: varchar("from_stage", { length: 50 }),
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  note: text("note"),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow(),
});

export const leadCustomFields = pgTable("lead_custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  fieldValue: text("field_value"),
});

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  courseId: uuid("course_id").references(() => courses.id),
  stage: varchar("stage", { length: 50 }).notNull().default("new"),
  expectedFee: numeric("expected_fee", { precision: 10, scale: 2 }),
  probability: integer("probability").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Task / Follow-Up Domain ─────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    assignedTo: uuid("assigned_to")
      .notNull()
      .references(() => users.id),
    taskType: taskTypeEnum("task_type").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    outcome: text("outcome"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_tasks_lead_id").on(t.leadId),
    index("idx_tasks_assigned_to").on(t.assignedTo),
    index("idx_tasks_due_at").on(t.dueAt),
    index("idx_tasks_status").on(t.status),
  ]
);

export const slaPolicies = pgTable("sla_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  stage: varchar("stage", { length: 50 }).notNull(),
  maxResponseHours: integer("max_response_hours").notNull(),
  escalateTo: uuid("escalate_to").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
});

export const slaTracking = pgTable("sla_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  taskId: uuid("task_id").references(() => tasks.id),
  policyId: uuid("policy_id").references(() => slaPolicies.id),
  breached: boolean("breached").notNull().default(false),
  breachedAt: timestamp("breached_at", { withTimezone: true }),
  escalationSent: boolean("escalation_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Communication Domain ────────────────────────────────────

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  channel: channelEnum("channel").notNull(),
  triggerEvent: varchar("trigger_event", { length: 100 }),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  variables: jsonb("variables"),
  waTemplateName: varchar("wa_template_name", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const communicationLogs = pgTable(
  "communication_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    taskId: uuid("task_id").references(() => tasks.id),
    channel: channelEnum("channel").notNull(),
    direction: commDirectionEnum("direction").notNull(),
    status: commStatusEnum("status").notNull().default("queued"),
    templateId: uuid("template_id").references(() => messageTemplates.id),
    subject: varchar("subject", { length: 500 }),
    body: text("body").notNull(),
    sentBy: uuid("sent_by").references(() => users.id),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    externalMessageId: varchar("external_message_id", { length: 300 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_comm_logs_lead_id").on(t.leadId),
    index("idx_comm_logs_channel").on(t.channel),
    index("idx_comm_logs_created_at").on(t.createdAt),
  ]
);

// ─── Automation Domain ───────────────────────────────────────

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
  triggerConditions: jsonb("trigger_conditions"),
  actions: jsonb("actions").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  executionCount: integer("execution_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const automationExecutionLog = pgTable("automation_execution_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id")
    .notNull()
    .references(() => automationRules.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  actionsTaken: jsonb("actions_taken"),
  status: automationStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
});

// ─── Re-engagement Domain ────────────────────────────────────

export const reEngagementCampaigns = pgTable("reengagement_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  targetStage: varchar("target_stage", { length: 50 }),
  dormantDays: integer("dormant_days").notNull(),
  channel: channelEnum("channel").notNull(),
  templateId: uuid("template_id").references(() => messageTemplates.id),
  maxAttempts: integer("max_attempts").notNull().default(3),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const reEngagementLog = pgTable("reengagement_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => reEngagementCampaigns.id),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id),
  attemptNumber: integer("attempt_number").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  responseReceived: boolean("response_received").notNull().default(false),
});

// ─── Report Templates ────────────────────────────────────────

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportKey: varchar("report_key", { length: 100 }).unique().notNull(),
  htmlTemplate: text("html_template").notNull(),
  css: text("css"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Notifications ──────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body"),
    leadId: uuid("lead_id").references(() => leads.id),
    taskId: uuid("task_id").references(() => tasks.id),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_notifications_user").on(t.userId, t.isRead, t.createdAt),
  ]
);

// ─── Push Subscriptions ─────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Relations ───────────────────────────────────────────────

export const leadsRelations = relations(leads, ({ one, many }) => ({
  course: one(courses, { fields: [leads.courseId], references: [courses.id] }),
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id],
  }),
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  stageHistory: many(leadStageHistory),
  customFields: many(leadCustomFields),
  opportunities: many(opportunities),
  tasks: many(tasks),
  communicationLogs: many(communicationLogs),
  reEngagementLog: many(reEngagementLog),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  lead: one(leads, { fields: [tasks.leadId], references: [leads.id] }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
}));

// ─── Zod Schemas ─────────────────────────────────────────────

export const insertLeadSchema = createInsertSchema(leads, {
  phone: z.string().min(10).max(15),
  email: z.string().email().optional().or(z.literal("")),
  leadScore: z.number().min(0).max(100).optional(),
}).omit({ id: true, leadNo: true, createdAt: true, updatedAt: true });

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});

// ─── Types ───────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type ReEngagementCampaign = typeof reEngagementCampaigns.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
