import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import { notificationService } from "../services/notificationService.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

export function startSlaWorker() {
  const worker = new Worker(
    "crm-sla",
    async (job) => {
      const { tenantId } = job.data as { tenantId: string };
      const db = await getPool(tenantId);

      // Find tasks that are overdue and not yet marked
      const overdueTasks = await db.query(`
        UPDATE tasks
        SET status = 'overdue', updated_at = now()
        WHERE status = 'pending'
          AND due_at < now()
        RETURNING id, lead_id, assigned_to
      `);

      // Emit task:overdue events and create notifications
      for (const t of overdueTasks.rows) {
        emitToTenant(tenantId, "task:overdue", { taskId: t.id, leadId: t.lead_id });
        if (t.assigned_to) {
          notificationService.notify(db, tenantId, t.assigned_to, "task_overdue",
            "Task overdue", { leadId: t.lead_id, taskId: t.id }).catch(() => {});
        }
      }

      // Check SLA policies: find leads that haven't been contacted within the allowed window
      const breaches = await db.query(`
        SELECT l.id AS lead_id, sp.id AS policy_id, sp.escalate_to,
               sp.max_response_hours
        FROM leads l
        JOIN sla_policies sp ON sp.stage = l.stage::TEXT AND sp.is_active = TRUE
        WHERE l.stage NOT IN ('admitted','lost')
          AND l.last_contacted_at IS NOT NULL
          AND l.last_contacted_at < now() - (sp.max_response_hours || ' hours')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM sla_tracking st
            WHERE st.lead_id = l.id
              AND st.policy_id = sp.id
              AND st.breached = TRUE
              AND st.breached_at > now() - interval '24 hours'
          )
      `);

      for (const row of breaches.rows) {
        // Insert breach record
        await db.query(
          `INSERT INTO sla_tracking (lead_id, policy_id, breached, breached_at)
           VALUES ($1, $2, TRUE, now())
           ON CONFLICT (lead_id, policy_id) DO NOTHING`,
          [row.lead_id, row.policy_id]
        );

        // Create escalation task if escalate_to set
        if (row.escalate_to) {
          await db.query(
            `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
             VALUES ($1,$2,'follow_up','SLA Breach - Immediate action required','pending','urgent', now() + interval '1 hour')`,
            [row.lead_id, row.escalate_to]
          );
        }

        // ── WhatsApp escalation to manager ───────────────────
        if (row.escalate_to) {
          try {
            const ctx = await db.query(
              `SELECT l.full_name AS lead_name, l.phone AS lead_phone, l.stage,
                      u_manager.phone AS manager_phone, u_manager.full_name AS manager_name,
                      u_counsellor.full_name AS counsellor_name
               FROM leads l
               LEFT JOIN users u_manager ON u_manager.id = $2
               LEFT JOIN users u_counsellor ON u_counsellor.id = l.assigned_to
               WHERE l.id = $1`,
              [row.lead_id, row.escalate_to]
            );
            const c = ctx.rows[0];
            if (c?.manager_phone) {
              const msg =
                `SLA Alert — Lead "${c.lead_name}" (${c.stage}) has not been contacted in over ` +
                `${row.max_response_hours}h. Assigned to: ${c.counsellor_name ?? "unassigned"}. ` +
                `Please follow up immediately.`;
              await whatsappService.sendText(c.manager_phone, msg);
              logger.info({ tenantId, leadId: row.lead_id, managerId: row.escalate_to }, "SLA WhatsApp escalation sent");
            }
          } catch (err) {
            logger.warn({ tenantId, leadId: row.lead_id, err }, "SLA WhatsApp escalation failed");
          }
        }

        // Real-time event + in-app notification
        emitToTenant(tenantId, "sla:breached", { leadId: row.lead_id, taskId: null });
        if (row.escalate_to) {
          notificationService.notify(db, tenantId, row.escalate_to, "sla_breach",
            "SLA Breach detected", { leadId: row.lead_id }).catch(() => {});
        }

        logger.warn({ tenantId, leadId: row.lead_id }, "SLA breach detected");
      }

      logger.info({ tenantId, breachCount: breaches.rowCount }, "SLA scan complete");
    },
    { connection: getRedisConnection(), concurrency: 5 }
  );

  return worker;
}
