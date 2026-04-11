import type { Pool } from "pg";
import type { SendMessagePayload } from "../../../shared/types.js";
import { whatsappService } from "./whatsappService.js";
import { emailService } from "./emailService.js";
import { smsService } from "./smsService.js";
import { ivrService } from "./ivrService.js";
import { communicationQueue } from "../queues/communicationQueue.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import logger from "../logger.js";

export const communicationService = {
  // Enqueue a message for async dispatch
  async send(db: Pool, tenantId: string, payload: SendMessagePayload, sentBy?: string) {
    // Fetch lead phone/email
    const lead = await db.query(
      "SELECT phone, email, full_name FROM leads WHERE id = $1",
      [payload.leadId]
    );
    if (!lead.rows[0]) throw Object.assign(new Error("Lead not found"), { status: 404 });

    // Resolve template if provided
    let body = payload.body;
    let subject = payload.subject;
    if (payload.templateId) {
      const tmpl = await db.query(
        "SELECT * FROM message_templates WHERE id = $1",
        [payload.templateId]
      );
      if (tmpl.rows[0]) {
        body = tmpl.rows[0].body;
        subject = tmpl.rows[0].subject;
      }
    }

    // Insert log in queued state
    const log = await db.query(
      `INSERT INTO communication_logs
         (lead_id, task_id, channel, direction, status, template_id, subject, body, sent_by)
       VALUES ($1,$2,$3,'outbound','queued',$4,$5,$6,$7) RETURNING id`,
      [payload.leadId, payload.taskId ?? null, payload.channel, payload.templateId ?? null, subject ?? null, body, sentBy ?? null]
    );

    const logId = log.rows[0].id;

    // Enqueue for dispatch
    await communicationQueue.add("dispatch", {
      tenantId,
      logId,
      leadId: payload.leadId,
      channel: payload.channel,
      phone: lead.rows[0].phone,
      email: lead.rows[0].email,
      fullName: lead.rows[0].full_name,
      subject,
      body,
      templateId: payload.templateId,
    }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: { count: 2000 },
    });

    return { logId };
  },

  // Called by communicationWorker — actual dispatch
  async dispatch(params: {
    logId: string;
    channel: string;
    phone: string;
    email?: string;
    fullName: string;
    subject?: string;
    body: string;
    db: Pool;
  }) {
    let externalId: string | undefined;

    try {
      if (params.channel === "whatsapp") {
        externalId = await whatsappService.sendText(params.phone, params.body);
      } else if (params.channel === "email") {
        externalId = await emailService.send(
          params.email ?? "",
          params.subject ?? "Message from CRM",
          params.body,
          params.fullName
        );
      } else if (params.channel === "sms") {
        externalId = await smsService.send(params.phone, params.body);
      } else if (params.channel === "ivr") {
        // body is used as the Exotel voice app ID; fall back to env default
        const appId = params.body?.trim() || process.env.EXOTEL_DEFAULT_APP_ID || "default";
        externalId = await ivrService.initiateCall(params.phone, appId);
      }

      await params.db.query(
        `UPDATE communication_logs
         SET status = 'sent', sent_at = now(), external_message_id = $1
         WHERE id = $2`,
        [externalId ?? null, params.logId]
      );

      // Update lead last_contacted_at
      await params.db.query(
        `UPDATE leads SET last_contacted_at = now(), updated_at = now()
         WHERE id = (SELECT lead_id FROM communication_logs WHERE id = $1)`,
        [params.logId]
      );

    } catch (err) {
      await params.db.query(
        "UPDATE communication_logs SET status = 'failed', error_message = $1 WHERE id = $2",
        [(err as Error).message, params.logId]
      );
      throw err;
    }
  },

  async updateDeliveryStatus(
    db: Pool,
    tenantId: string,
    externalMessageId: string,
    status: string,
    timestamp?: Date
  ) {
    const col =
      status === "delivered" ? "delivered_at"
      : status === "read" ? "read_at"
      : null;

    const ts = timestamp ?? new Date();

    await db.query(
      `UPDATE communication_logs
       SET status = $1 ${col ? `, ${col} = $3` : ""}
       WHERE external_message_id = $2`,
      col ? [status, externalMessageId, ts] : [status, externalMessageId]
    );

    // Emit real-time event for delivery updates
    const log = await db.query(
      "SELECT lead_id FROM communication_logs WHERE external_message_id = $1",
      [externalMessageId]
    );
    if (log.rows[0]) {
      const event = status === "replied" ? "message:replied" : "message:delivered";
      emitToTenant(tenantId, event, { leadId: log.rows[0].lead_id, messageId: externalMessageId });
    }
  },
};
