import { Router } from "express";
import axios from "axios";
import crypto from "crypto";
import type { Pool } from "pg";
import { env } from "../env.js";
import { leadService } from "../services/leadService.js";
import { communicationService } from "../services/communicationService.js";
import { razorpayService } from "../services/razorpayService.js";
import { getPool } from "../tenant/dbPool.js";
import { getRegistry } from "../tenant/registry.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import logger from "../logger.js";
import { metaConsoleStore } from "../lib/metaConsoleStore.js";
import { parseMetaWebhookPayload } from "../lib/metaWebhookParser.js";

const router = Router();

// ─── Meta Lead Ads Webhook ─────────────────────────────────────

// GET /api/webhooks/meta  — verification challenge
router.get("/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN) {
    logger.info("Meta webhook verified");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ ok: false, message: "Verification failed" });
  }
});

// POST /api/webhooks/meta  — inbound lead events
// Note: raw body required for HMAC verification (set up in server.ts)
router.post("/meta", async (req, res) => {
  // HMAC signature verification
  const signature = req.headers["x-hub-signature-256"] as string;
  if (env.META_APP_SECRET && signature) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (rawBody) {
      const expected = `sha256=${crypto
        .createHmac("sha256", env.META_APP_SECRET)
        .update(rawBody)
        .digest("hex")}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(403).json({ ok: false, message: "Invalid signature" });
        return;
      }
    }
  }

  // Meta sends events to a single webhook — route to correct tenant via form_id mapping
  const body = req.body as {
    object: string;
    entry: Array<{
      changes: Array<{
        value: { leadgen_id: string; form_id: string; ad_id: string; campaign_id?: string };
        field: string;
      }>;
    }>;
  };

  if (body.object !== "page") { res.sendStatus(200); return; }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id, form_id, ad_id } = change.value;

      // Find tenant that owns this form_id
      const tenantId = await findTenantByFormId(form_id);
      if (!tenantId) {
        logger.warn({ form_id }, "No tenant found for Meta form_id");
        continue;
      }

      try {
        const db = await getPool(tenantId);

        // Fetch full lead data from Meta Graph API
        const leadData = await fetchMetaLeadData(leadgen_id);

        // Find matching campaign
        const campaign = await db.query(
          "SELECT id FROM campaigns WHERE meta_campaign_id = $1 LIMIT 1",
          [change.value.campaign_id ?? ""]
        );

        await leadService.create(db, tenantId, {
          fullName: leadData.full_name ?? "Unknown",
          phone: leadData.phone_number ?? "",
          email: leadData.email,
          source: "meta_ads",
          adId: ad_id,
          formId: form_id,
          campaignId: campaign.rows[0]?.id ?? undefined,
        });

        logger.info({ tenantId, leadgen_id }, "Meta lead created");
      } catch (err) {
        logger.error({ err, leadgen_id, tenantId }, "Failed to process Meta lead");
      }
    }
  }

  res.sendStatus(200);
});

// ─── WhatsApp Inbound Messages ────────────────────────────────

router.post("/whatsapp", async (req, res) => {
  const body = req.body as {
    object: string;
    entry: Array<{
      id: string;
      changes: Array<{
        value: {
          messages?: Array<{
            id: string;
            from: string;
            type: string;
            text?: { body: string };
            timestamp: string;
          }>;
          statuses?: Array<{
            id: string;
            status: string;
            timestamp: string;
          }>;
        };
      }>;
    }>;
  };

  if (body.object !== "whatsapp_business_account") { res.sendStatus(200); return; }

  // Log to internal console store for debugging (dev + production)
  try {
    const parsed = parseMetaWebhookPayload(body);
    const first  = parsed.find((e) => e.eventType === "message_in")
                ?? parsed.find((e) => e.eventType === "status_update")
                ?? parsed[0];
    metaConsoleStore.addWebhookLog({
      source:      "real",
      eventType:   first?.eventType ?? "unknown",
      from:        first?.from ?? first?.statusRecipient,
      messageType: first?.messageType,
      preview:     first?.messageBody?.slice(0, 100),
      status:      "parsed",
      rawPayload:  body,
      parsedEntries: parsed,
    });
  } catch { /* store errors must never break the real handler */ }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const val = change.value;

      // Handle delivery status updates
      if (val.statuses) {
        for (const status of val.statuses) {
          const tenantId = await findTenantByPhoneNumberId(entry.id);
          if (!tenantId) continue;
          const db = await getPool(tenantId);
          await communicationService.updateDeliveryStatus(db, tenantId, status.id, status.status);
        }
      }

      // Handle inbound messages
      if (val.messages) {
        for (const msg of val.messages) {
          const tenantId = await findTenantByPhoneNumberId(entry.id);
          if (!tenantId) continue;
          const db = await getPool(tenantId);

          const lead = await db.query(
            "SELECT id FROM leads WHERE phone LIKE $1 LIMIT 1",
            [`%${msg.from.slice(-10)}`]
          );
          if (!lead.rows[0]) continue;

          await db.query(
            `INSERT INTO communication_logs
               (lead_id, channel, direction, status, body, sent_at, external_message_id)
             VALUES ($1,'whatsapp','inbound','replied',$2,to_timestamp($3),$4)`,
            [lead.rows[0].id, msg.text?.body ?? "", parseInt(msg.timestamp), msg.id]
          );

          // Update last_contacted_at
          await db.query(
            "UPDATE leads SET last_contacted_at = now(), updated_at = now() WHERE id = $1",
            [lead.rows[0].id]
          );

          // Mark reengagement response if this lead was part of an active campaign
          await db.query(
            `UPDATE reengagement_log SET response_received = TRUE
             WHERE lead_id = $1 AND response_received = FALSE
               AND id = (SELECT id FROM reengagement_log WHERE lead_id = $1 AND response_received = FALSE ORDER BY created_at DESC LIMIT 1)`,
            [lead.rows[0].id]
          );

          // Keyword handling — "YES" / "INTERESTED" / "STOP"
          const replyText = (msg.text?.body ?? "").trim().toUpperCase();
          if (replyText === "YES" || replyText === "INTERESTED" || replyText === "YES INTERESTED") {
            await handleYesReply(db, tenantId, lead.rows[0].id);
          } else if (replyText === "STOP" || replyText === "UNSUBSCRIBE") {
            await db.query(
              "UPDATE leads SET stage = 'lost', updated_at = now() WHERE id = $1 AND stage = 'new'",
              [lead.rows[0].id]
            );
            await db.query(
              "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'new','lost',NULL,'Replied STOP on WhatsApp')",
              [lead.rows[0].id]
            );
          }

          // Real-time event
          emitToTenant(tenantId, "message:replied", {
            leadId: lead.rows[0].id,
            messageId: msg.id,
            body: msg.text?.body ?? "",
          });
        }
      }
    }
  }

  res.sendStatus(200);
});

// ─── Website Form Webhook ──────────────────────────────────────

router.post("/website/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const registry = getRegistry();
  if (!registry.tenants[tenantId]) { res.status(404).json({ ok: false }); return; }

  const db = await getPool(tenantId);
  const body = req.body as {
    fullName?: string;
    phone?: string;
    email?: string;
    course?: string;
    city?: string;
    source?: string;
  };

  if (!body.phone) { res.status(400).json({ ok: false, message: "phone required" }); return; }

  let courseId: string | undefined;
  if (body.course) {
    const c = await db.query("SELECT id FROM courses WHERE name ILIKE $1 LIMIT 1", [body.course]);
    courseId = c.rows[0]?.id;
  }

  await leadService.create(db, tenantId, {
    fullName: body.fullName ?? "Website Lead",
    phone: body.phone,
    email: body.email,
    city: body.city,
    courseId,
    source: "website",
  });

  res.status(201).json({ ok: true });
});

// ─── Exotel IVR Status Callback ───────────────────────────────

router.post("/exotel/status", async (req, res) => {
  const { CallSid, Status, To } = req.body as { CallSid: string; Status: string; To: string };
  // Route to correct tenant via To number lookup
  logger.info({ CallSid, Status, To }, "Exotel call status");
  // Map status: completed → delivered, busy/no-answer → failed
  const commStatus = Status === "completed" ? "delivered" : "failed";

  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    const db = await getPool(tenantId);
    await communicationService.updateDeliveryStatus(db, tenantId, CallSid, commStatus);
  }

  res.sendStatus(200);
});

// ─── YES reply handler ────────────────────────────────────────

async function handleYesReply(db: Pool, tenantId: string, leadId: string) {
  // 1. Move stage new → contacted (only if still new)
  const leadRow = await db.query(
    "SELECT stage, full_name, phone, assigned_to FROM leads WHERE id = $1",
    [leadId]
  );
  const lead = leadRow.rows[0];
  if (!lead) return;

  if (lead.stage === "new") {
    await db.query(
      "UPDATE leads SET stage = 'contacted', updated_at = now() WHERE id = $1",
      [leadId]
    );
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'new','contacted',NULL,'Replied YES on WhatsApp')",
      [leadId]
    );
    emitToTenant(tenantId, "lead:stage_changed", { leadId, from: "new", to: "contacted" });
  }

  // 2. Create urgent call task for assigned counsellor (or any active admin)
  let assignTo: string | null = lead.assigned_to ?? null;
  if (!assignTo) {
    const fallback = await db.query(
      "SELECT id FROM users WHERE role IN ('admin','manager') AND is_active = TRUE ORDER BY created_at ASC LIMIT 1"
    );
    assignTo = fallback.rows[0]?.id ?? null;
  }

  if (assignTo) {
    const dueAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const task = await db.query(
      `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
       VALUES ($1,$2,'call',$3,'pending','urgent',$4) RETURNING id`,
      [leadId, assignTo, `${lead.full_name} replied YES — call now`, dueAt]
    );

    // 3. In-app notification to counsellor
    const { notificationService } = await import("../services/notificationService.js");
    await notificationService.notify(
      db, tenantId, assignTo,
      "lead_replied",
      `${lead.full_name} replied YES on WhatsApp — call now`,
      { leadId, taskId: task.rows[0]?.id }
    );

    // 4. Real-time bell ring
    emitToTenant(tenantId, "notification", {
      type: "lead_replied",
      message: `${lead.full_name} replied YES on WhatsApp`,
      severity: "success",
      leadId,
    });

    // 5. SMS alert to counsellor's own phone
    const counsellorRow = await db.query(
      "SELECT phone, full_name FROM users WHERE id = $1",
      [assignTo]
    );
    const counsellor = counsellorRow.rows[0];
    if (counsellor?.phone) {
      try {
        const { smsService } = await import("../services/smsService.js");
        await smsService.send(
          counsellor.phone,
          `Hi ${counsellor.full_name?.split(" ")[0]}, ${lead.full_name} replied YES on WhatsApp. Call now: ${lead.phone}`
        );
      } catch (err) {
        logger.warn({ err, leadId }, "Counsellor SMS alert failed — continuing");
      }
    }

    logger.info({ leadId, assignTo, tenantId }, "YES reply handled — task + notification sent");
  }
}

// ─── Helpers ──────────────────────────────────────────────────

async function fetchMetaLeadData(leadgenId: string) {
  const res = await axios.get(
    `https://graph.facebook.com/${env.META_API_VERSION}/${leadgenId}`,
    { params: { access_token: env.META_ACCESS_TOKEN, fields: "field_data" } }
  );
  const fields = res.data?.field_data as Array<{ name: string; values: string[] }>;
  const get = (name: string) => fields?.find((f) => f.name === name)?.values?.[0] ?? "";
  return {
    full_name: get("full_name"),
    phone_number: get("phone_number"),
    email: get("email"),
  };
}

// Finds tenant by form_id — checks existing leads first, falls back to first tenant
async function findTenantByFormId(formId: string): Promise<string | null> {
  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    const db = await getPool(tenantId);
    const res = await db.query(
      "SELECT 1 FROM leads WHERE form_id = $1 LIMIT 1",
      [formId]
    );
    if ((res.rowCount ?? 0) > 0) return tenantId;
  }
  // Fallback: route to first tenant (single-tenant or when no prior lead from this form)
  const firstTenant = Object.keys(registry.tenants)[0];
  return firstTenant ?? null;
}

async function findTenantByPhoneNumberId(_phoneNumberId: string): Promise<string | null> {
  // In production, store phone_number_id → tenantId mapping in app_settings
  const registry = getRegistry();
  const firstTenantId = Object.keys(registry.tenants)[0];
  return firstTenantId ?? null;
}

// ─── Razorpay Payment Webhook ─────────────────────────────────
// POST /api/webhooks/razorpay?tenant=<tenantId>
router.post("/razorpay", async (req, res) => {
  const tenantId = (req.query["tenant"] as string) ?? Object.keys(getRegistry().tenants)[0];
  const signature = req.headers["x-razorpay-signature"] as string ?? "";
  const raw = JSON.stringify(req.body);

  if (env.RAZORPAY_WEBHOOK_SECRET && !razorpayService.verifyWebhookSignature(raw, signature)) {
    logger.warn({ tenantId }, "Razorpay webhook signature mismatch");
    res.status(400).json({ ok: false, message: "Invalid signature" });
    return;
  }

  const event = req.body?.event as string;
  const payload = req.body?.payload;

  logger.info({ tenantId, event }, "Razorpay webhook received");

  // payment_link.paid — customer has paid
  if (event === "payment_link.paid") {
    const linkId = payload?.payment_link?.entity?.id as string;
    const amount = (payload?.payment?.entity?.amount as number ?? 0) / 100; // paise → ₹
    const paymentId = payload?.payment?.entity?.id as string;

    if (linkId) {
      try {
        const db = await getPool(tenantId);
        // Find the pending payment record by receipt_no = linkId
        const row = await db.query(
          "SELECT * FROM payments WHERE receipt_no = $1 AND status = 'pending' LIMIT 1",
          [linkId]
        );
        if (row.rows[0]) {
          await db.query(
            `UPDATE payments SET status='completed', notes='Razorpay payment ID: ' || $2, updated_at=now()
             WHERE id=$1`,
            [row.rows[0].id, paymentId]
          );
          emitToTenant(tenantId, "payment:completed", { paymentId: row.rows[0].id, leadId: row.rows[0].lead_id, amount });
          logger.info({ tenantId, linkId, paymentId, amount }, "Razorpay payment marked completed");
        }
      } catch (err) {
        logger.error({ tenantId, linkId, err }, "Razorpay webhook DB update failed");
      }
    }
  }

  res.json({ ok: true });
});

export default router;
