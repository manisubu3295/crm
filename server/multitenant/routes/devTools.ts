/**
 * Dev-only routes — never mounted in production.
 * Covers: lead creation, automation triggers, channel sends, webhook simulation.
 */
import { Router } from "express";
import axios from "axios";
import { env } from "../env.js";
import { getPool } from "../tenant/dbPool.js";
import { getRegistry } from "../tenant/registry.js";
import { automationService } from "../services/automationService.js";
import { communicationService } from "../services/communicationService.js";
import { leadService } from "../services/leadService.js";
import logger from "../logger.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────

async function getDb(req: any) {
  const tenantId = (req.headers["x-tenant"] as string) ?? env.DEMO_TENANT_ID;
  const registry = getRegistry();
  if (!registry.tenants[tenantId]) throw new Error(`Unknown tenant: ${tenantId}`);
  return { db: await getPool(tenantId), tenantId };
}

// ── GET /api/dev/status ───────────────────────────────────────
// Returns which integrations are configured.
router.get("/status", async (req, res) => {
  const { db, tenantId } = await getDb(req);

  const [settings, templates, rules, campaigns] = await Promise.all([
    db.query("SELECT key, value FROM app_settings LIMIT 20"),
    db.query("SELECT id, name, channel FROM message_templates WHERE is_active = TRUE ORDER BY channel, name"),
    db.query("SELECT id, name, trigger_event, is_active, actions FROM automation_rules ORDER BY created_at DESC LIMIT 20"),
    db.query("SELECT id, name, source, is_active FROM campaigns ORDER BY created_at DESC LIMIT 10"),
  ]);

  res.json({
    ok: true,
    tenantId,
    channels: {
      whatsapp: !!(env.META_ACCESS_TOKEN && env.META_PHONE_NUMBER_ID),
      email:    !!env.SENDGRID_API_KEY,
      sms:      !!env.MSG91_AUTH_KEY,
      ivr:      !!(env.EXOTEL_API_KEY && env.EXOTEL_SID),
    },
    templates:  templates.rows,
    rules:      rules.rows,
    campaigns:  campaigns.rows,
    appSettings: Object.fromEntries(settings.rows.map((r: any) => [r.key, r.value])),
  });
});

// ── POST /api/dev/seed-test-data ──────────────────────────────
// Creates templates + automation rules for all channels so testing works out of the box.
router.post("/seed-test-data", async (req, res) => {
  let _step = "getDb";
  try {
    const { db, tenantId } = await getDb(req);
    // 1. Message templates for each channel
    _step = "templates";
    const tplSeeds = [
      { name: "Test WhatsApp Welcome",   channel: "whatsapp", trigger_event: "lead_created",        body: "Hi {{name}}, thanks for your interest in our courses! Our team will contact you shortly. Reply YES to confirm interest." },
      { name: "Test WhatsApp Follow-up", channel: "whatsapp", trigger_event: "no_response_24h",     body: "Hi {{name}}, just following up on your enquiry. Are you still interested? Reply INTERESTED to proceed." },
      { name: "Test Email Welcome",       channel: "email",    trigger_event: "lead_created",        subject: "Welcome to Marcellotech Training", body: "Dear {{name}},\n\nThank you for your interest. We will reach out soon.\n\nBest regards,\nMarcellotech Team" },
      { name: "Test SMS Alert",           channel: "sms",      trigger_event: "no_response_48h",    body: "Hi {{name}}, this is Marcellotech Training. Reply STOP to opt out." },
      { name: "Test IVR Follow-up",       channel: "ivr",      trigger_event: "payment_pending_24h", body: "default" },
    ];

    const insertedTemplates: any[] = [];
    for (const t of tplSeeds) {
      const exists = await db.query("SELECT id FROM message_templates WHERE name = $1", [t.name]);
      if (!exists.rows[0]) {
        const r = await db.query(
          `INSERT INTO message_templates (name, channel, trigger_event, subject, body, is_active)
           VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id, name, channel`,
          [t.name, t.channel, t.trigger_event, (t as any).subject ?? null, t.body]
        );
        insertedTemplates.push(r.rows[0]);
      } else {
        insertedTemplates.push({ ...exists.rows[0], name: t.name, channel: t.channel, existing: true });
      }
    }

    // 2. Automation rules
    _step = "automation_rules";
    const [waWelcomeTpl, waFollowTpl, emailTpl, smsTpl] = await Promise.all([
      db.query("SELECT id FROM message_templates WHERE name = 'Test WhatsApp Welcome' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test WhatsApp Follow-up' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test Email Welcome' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test SMS Alert' LIMIT 1"),
    ]);

    const ruleSeeds = [
      {
        name: "E2E: New Lead — WhatsApp + Email + Task",
        trigger_event: "lead_created",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "whatsapp", templateId: waWelcomeTpl.rows[0]?.id },
          { type: "send_message", channel: "email",    templateId: emailTpl.rows[0]?.id },
          { type: "assign_task",  taskType: "call", title: "Initial call to new lead", dueHours: 2, priority: "high" },
        ].filter((a: any) => a.type !== "send_message" || a.templateId),
      },
      {
        name: "E2E: No Response 24h — WhatsApp Follow-up",
        trigger_event: "no_response_24h",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "whatsapp", templateId: waFollowTpl.rows[0]?.id },
        ].filter((a: any) => a.templateId),
      },
      {
        name: "E2E: No Response 48h — SMS",
        trigger_event: "no_response_48h",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "sms", templateId: smsTpl.rows[0]?.id },
          { type: "assign_task",  taskType: "follow_up", title: "Urgent: Lead unresponsive 48h", dueHours: 1, priority: "urgent" },
        ].filter((a: any) => a.type !== "send_message" || a.templateId),
      },
      {
        name: "E2E: Stage → Interested — Schedule Demo",
        trigger_event: "lead_stage_changed",
        trigger_conditions: { toStage: "interested" },
        delay_minutes: 0,
        actions: [
          { type: "assign_task", taskType: "demo", title: "Schedule demo for interested lead", dueHours: 4, priority: "high" },
        ],
      },
    ];

    const insertedRules: any[] = [];
    for (const r of ruleSeeds) {
      if (!r.actions.length) { insertedRules.push({ name: r.name, skipped: "no valid actions (templates missing?)" }); continue; }
      const exists = await db.query("SELECT id FROM automation_rules WHERE name = $1", [r.name]);
      if (!exists.rows[0]) {
        const inserted = await db.query(
          `INSERT INTO automation_rules (name, trigger_event, trigger_conditions, actions, delay_minutes, is_active, execution_count, created_by)
           VALUES ($1,$2,$3,$4,$5,TRUE,0,(SELECT id FROM users WHERE role='admin' LIMIT 1)) RETURNING id, name`,
          [r.name, r.trigger_event, (r as any).trigger_conditions ? JSON.stringify((r as any).trigger_conditions) : null, JSON.stringify(r.actions), r.delay_minutes]
        );
        insertedRules.push(inserted.rows[0]);
      } else {
        insertedRules.push({ ...exists.rows[0], name: r.name, existing: true });
      }
    }

    // 3. Test campaign
    _step = "campaign";
    let campaign: any = (await db.query("SELECT id, name FROM campaigns WHERE name = 'E2E Test Campaign' LIMIT 1")).rows[0];
    if (!campaign) {
      const r = await db.query(
        `INSERT INTO campaigns (name, source, start_date, end_date, budget, is_active)
         VALUES ('E2E Test Campaign','other', CURRENT_DATE, CURRENT_DATE + interval '30 days', 10000, TRUE)
         RETURNING id, name`
      );
      campaign = r.rows[0];
    }

    res.json({ ok: true, tenantId, insertedTemplates, insertedRules, campaign });
  } catch (err: any) {
    logger.error({ err, _step }, "DEV seed-test-data failed");
    res.status(500).json({ ok: false, message: `Seed failed at step '${_step}': ${err.message}`, detail: err.detail ?? null });
  }
});

// ── POST /api/dev/create-lead ─────────────────────────────────
router.post("/create-lead", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const {
    fullName = "Test Student E2E",
    phone    = "9" + Math.floor(100000000 + Math.random() * 900000000),
    email    = `test.e2e.${Date.now()}@example.com`,
    source   = "website",
    campaignId,
  } = req.body as any;

  // Get first admin user as creator
  const admin = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE LIMIT 1");
  const adminId = admin.rows[0]?.id;

  // Get test campaign if not provided
  let campId = campaignId;
  if (!campId) {
    const camp = await db.query("SELECT id FROM campaigns WHERE name = 'E2E Test Campaign' LIMIT 1");
    campId = camp.rows[0]?.id ?? null;
  }

  const result = await leadService.create(db, tenantId, {
    fullName, phone, email, source, campaignId: campId,
    alternatePhone: null, city: "Chennai", qualification: "B.Tech",
    courseId: null, adId: null, formId: null, assignedTo: adminId ?? null,
  } as any, adminId);

  logger.info({ leadId: result.lead.id, tenantId }, "DEV: test lead created");
  res.json({ ok: true, lead: result.lead, duplicate: result.duplicate });
});

// ── POST /api/dev/trigger-event ───────────────────────────────
// Manually fires an automation trigger event for a lead.
router.post("/trigger-event", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, event, context = {} } = req.body as { leadId: string; event: string; context?: Record<string, unknown> };

  if (!leadId || !event) {
    res.status(400).json({ ok: false, message: "leadId and event required" });
    return;
  }

  // Verify lead exists
  const lead = await db.query("SELECT id, full_name FROM leads WHERE id = $1", [leadId]);
  if (!lead.rows[0]) { res.status(404).json({ ok: false, message: "Lead not found" }); return; }

  await automationService.processEvent(db, tenantId, event as any, leadId, context);

  logger.info({ leadId, event, tenantId }, "DEV: automation event triggered");
  res.json({ ok: true, message: `Event '${event}' triggered for lead ${lead.rows[0].full_name}` });
});

// ── POST /api/dev/send-channel ────────────────────────────────
// Sends a message via a specific channel directly (bypasses automation).
router.post("/send-channel", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, channel, templateId, body } = req.body as {
    leadId: string; channel: string; templateId?: string; body?: string;
  };

  if (!leadId || !channel) {
    res.status(400).json({ ok: false, message: "leadId and channel required" });
    return;
  }

  let msgBody = body;
  if (!msgBody && templateId) {
    const tmpl = await db.query("SELECT body FROM message_templates WHERE id = $1", [templateId]);
    msgBody = tmpl.rows[0]?.body;
  }
  if (!msgBody) {
    res.status(400).json({ ok: false, message: "body or templateId required" });
    return;
  }

  const result = await communicationService.send(db, tenantId, {
    leadId,
    channel: channel as any,
    templateId,
    body: msgBody,
  });

  res.json({ ok: true, logId: result.logId, channel, message: `Queued ${channel} message` });
});

// ── POST /api/dev/simulate-whatsapp-reply ─────────────────────
// Simulates an inbound WhatsApp reply from the student.
router.post("/simulate-whatsapp-reply", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, replyText = "YES I am interested" } = req.body as { leadId: string; replyText?: string };

  if (!leadId) { res.status(400).json({ ok: false, message: "leadId required" }); return; }

  const lead = await db.query("SELECT phone, full_name FROM leads WHERE id = $1", [leadId]);
  if (!lead.rows[0]) { res.status(404).json({ ok: false, message: "Lead not found" }); return; }

  // Insert as an inbound communication log entry (same as real webhook would do)
  const log = await db.query(
    `INSERT INTO communication_logs (lead_id, channel, direction, status, body, sent_at, created_at)
     VALUES ($1, 'whatsapp', 'inbound', 'delivered', $2, now(), now()) RETURNING id`,
    [leadId, replyText]
  );

  // Fire automation event for reply
  await automationService.processEvent(db, tenantId, "lead_stage_changed" as any, leadId, {
    toStage: "interested",
    fromStage: "contacted",
    replyText,
  });

  // Update lead stage to interested
  await db.query(
    "UPDATE leads SET stage = 'interested', updated_at = now() WHERE id = $1",
    [leadId]
  );
  await db.query(
    "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'contacted','interested',NULL,'Auto: WhatsApp reply received')",
    [leadId]
  );

  logger.info({ leadId, replyText, tenantId }, "DEV: WhatsApp reply simulated");
  res.json({ ok: true, logId: log.rows[0].id, leadStageUpdated: "interested", replyText });
});

// ── POST /api/dev/convert-lead ────────────────────────────────
// Moves a lead through stages to 'admitted'.
router.post("/convert-lead", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, finalStage = "admitted", changedBy } = req.body as {
    leadId: string; finalStage?: string; changedBy?: string;
  };

  if (!leadId) { res.status(400).json({ ok: false, message: "leadId required" }); return; }

  const admin = changedBy ?? (await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0]?.id;

  const stagesPath = ["contacted", "qualified", "demo", "interested", "payment", finalStage];
  const results: string[] = [];

  for (const stage of stagesPath) {
    await db.query(
      "UPDATE leads SET stage = $1, updated_at = now() WHERE id = $2",
      [stage, leadId]
    );
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,$3,'E2E test conversion')",
      [leadId, stage, admin]
    );
    await automationService.processEvent(db, tenantId, "lead_stage_changed", leadId, {
      toStage: stage,
      fromStage: results[results.length - 1] ?? "new",
    });
    results.push(stage);
  }

  if (finalStage === "admitted") {
    await db.query("UPDATE leads SET admitted_at = now() WHERE id = $1", [leadId]);
  }

  res.json({ ok: true, leadId, stagesTraversed: results, finalStage });
});

// ── GET /api/dev/lead-timeline ────────────────────────────────
// Full audit trail for a lead: stage history, comms, tasks, automation logs.
router.get("/lead-timeline/:leadId", async (req, res) => {
  const { db } = await getDb(req);
  const { leadId } = req.params;

  const [lead, stages, comms, tasks, automationLogs] = await Promise.all([
    db.query(`SELECT l.*, u.full_name AS assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id WHERE l.id=$1`, [leadId]),
    db.query("SELECT * FROM lead_stage_history WHERE lead_id=$1 ORDER BY changed_at ASC", [leadId]),
    db.query("SELECT * FROM communication_logs WHERE lead_id=$1 ORDER BY created_at ASC", [leadId]),
    db.query("SELECT t.*, u.full_name AS assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.lead_id=$1 ORDER BY t.created_at ASC", [leadId]),
    db.query(
      `SELECT ael.*, ar.name AS rule_name FROM automation_execution_log ael
       JOIN automation_rules ar ON ael.rule_id=ar.id
       WHERE ael.lead_id=$1 ORDER BY ael.triggered_at ASC`,
      [leadId]
    ),
  ]);

  if (!lead.rows[0]) { res.status(404).json({ ok: false, message: "Lead not found" }); return; }

  res.json({
    ok: true,
    lead: lead.rows[0],
    timeline: {
      stageHistory:   stages.rows,
      communications: comms.rows,
      tasks:          tasks.rows,
      automationRuns: automationLogs.rows,
    },
    summary: {
      totalStageChanges:  stages.rowCount,
      totalMessages:      comms.rowCount,
      totalTasks:         tasks.rowCount,
      automationsFired:   automationLogs.rowCount,
      channelsUsed:       [...new Set(comms.rows.map((c: any) => c.channel))],
    },
  });
});

// ── POST /api/dev/whatsapp-send (original) ────────────────────
router.post("/whatsapp-send", async (req, res) => {
  const { to, templateName = "hello_world", languageCode = "en_US" } = req.body as {
    to?: string; templateName?: string; languageCode?: string;
  };
  if (!to) { res.status(400).json({ ok: false, message: "to required" }); return; }
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    res.status(503).json({ ok: false, message: "META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured" });
    return;
  }
  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;
  const metaRes = await axios.post(url, {
    messaging_product: "whatsapp", to, type: "template",
    template: { name: templateName, language: { code: languageCode } },
  }, {
    headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    validateStatus: () => true,
  });
  res.status(metaRes.status).json({ ok: metaRes.status >= 200 && metaRes.status < 300, meta: metaRes.data });
});

export default router;
