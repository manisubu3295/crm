import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/redisClient.js";
import { getTenantDb } from "../db/tenantDb.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

/**
 * NPS Worker — runs daily at 10 AM IST.
 * Step 1: Auto-complete enrollments where batch end_date has passed and completion_date is not set.
 * Step 2: Finds newly completed enrollments and sends NPS WhatsApp survey.
 */
export function startNpsWorker() {
  const worker = new Worker(
    "crm-nps",
    async (job) => {
      if (job.name !== "nps-scan") return;
      const { tenantId } = job.data as { tenantId: string };
      const db = getTenantDb(tenantId);

      // ── Step 1: Auto-complete enrollments for expired batches ─────────────
      const autoCompleted = await db.query(
        `UPDATE enrollments e
         SET completion_date = b.end_date
         FROM batches b
         WHERE e.batch_id = b.id
           AND b.end_date IS NOT NULL
           AND b.end_date::date < CURRENT_DATE
           AND e.completion_date IS NULL
         RETURNING e.lead_id, e.batch_id, b.course_id`
      );

      if (autoCompleted.rowCount && autoCompleted.rowCount > 0) {
        logger.info({ tenantId, count: autoCompleted.rowCount }, "Auto-completed enrollments for expired batches");
      }

      // ── Step 2: Send NPS survey for completions from yesterday ────────────
      const completions = await db.query(
        `SELECT e.lead_id, e.batch_id, e.id AS enrollment_id, b.course_id,
                l.full_name, l.phone
         FROM enrollments e
         JOIN leads l ON l.id = e.lead_id
         JOIN batches b ON b.id = e.batch_id
         WHERE e.completion_date::date = (now() - interval '1 day')::date
           AND NOT EXISTS (
             SELECT 1 FROM nps_responses n
             WHERE n.lead_id = e.lead_id AND n.batch_id = e.batch_id
           )`
      );

      let sent = 0;
      for (const row of completions.rows) {
        try {
          await db.query(
            `INSERT INTO nps_responses (lead_id, batch_id, course_id, sent_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT DO NOTHING`,
            [row.lead_id, row.batch_id, row.course_id]
          );

          const msg =
            `Hi ${row.full_name}, congratulations on completing your course! 🎓\n` +
            `On a scale of 0–10, how likely are you to recommend us to a friend or colleague?\n` +
            `Reply with just a number (0-10) and any feedback you'd like to share.`;

          await whatsappService.sendText(row.phone, msg);
          sent++;
        } catch (err) {
          logger.warn({ tenantId, leadId: row.lead_id, err }, "NPS survey send failed");
        }
      }

      logger.info({ tenantId, sent }, "NPS scan complete");
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "NPS worker job failed");
  });

  return worker;
}
