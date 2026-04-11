import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/redisClient.js";
import { getTenantDb } from "../db/tenantDb.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

/**
 * NPS Worker — runs daily at 10 AM IST.
 * Finds enrollments where completion_date = yesterday and no NPS already sent.
 * Sends WhatsApp survey and records the nps_responses row.
 */
export function startNpsWorker() {
  const worker = new Worker(
    "crm-nps",
    async (job) => {
      if (job.name !== "nps-scan") return;
      const { tenantId } = job.data as { tenantId: string };
      const db = getTenantDb(tenantId);

      // Find completions from yesterday without an NPS response
      const completions = await db.query(
        `SELECT e.lead_id, e.batch_id, b.course_id,
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
