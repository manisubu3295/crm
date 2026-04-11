import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import { notificationService } from "../services/notificationService.js";
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

        // Real-time event + notification
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
