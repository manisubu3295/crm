import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { notificationService } from "../services/notificationService.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import logger from "../logger.js";

export function startFollowUpWorker() {
  const worker = new Worker(
    "crm-followup",
    async (job) => {
      const { taskId, tenantId } = job.data as { taskId: string; tenantId: string };
      const db = await getPool(tenantId);

      const result = await db.query(
        `SELECT t.id, t.title, t.lead_id, t.assigned_to, t.due_at,
                l.full_name AS lead_name, u.full_name AS counsellor_name
         FROM tasks t
         JOIN leads l ON t.lead_id = l.id
         JOIN users u ON t.assigned_to = u.id
         WHERE t.id = $1`,
        [taskId]
      );

      if (!result.rows[0]) return;
      const t = result.rows[0];

      // Re-check task is still actionable
      const current = await db.query("SELECT status FROM tasks WHERE id = $1", [taskId]);
      if (!["pending", "in_progress"].includes(current.rows[0]?.status)) return;

      // In-app notification to the assigned counsellor
      await notificationService.notify(
        db, tenantId, t.assigned_to,
        "task_reminder",
        `Reminder: "${t.title}" for ${t.lead_name} is due soon`,
        { taskId: t.id, leadId: t.lead_id }
      );

      // Real-time push so the bell icon updates immediately
      emitToTenant(tenantId, "notification", {
        type: "task_reminder",
        message: `Task "${t.title}" is due soon`,
        severity: "warning",
      });

      logger.info({ taskId, tenantId }, "Follow-up reminder sent");
    },
    { connection: getRedisConnection(), concurrency: 20 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Follow-up job failed");
  });

  return worker;
}
