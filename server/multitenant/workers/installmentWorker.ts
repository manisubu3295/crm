import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

/**
 * Daily at 9 AM IST (startInstallmentCron schedules this).
 * 1. Mark past-due pending installments as 'overdue'
 * 2. Send WhatsApp reminders:
 *    - Overdue: daily nudge (if not reminded today)
 *    - Due in 3 days: one-time advance notice
 */
export function startInstallmentWorker() {
  const worker = new Worker(
    "crm-installments",
    async (job) => {
      const { tenantId } = job.data as { tenantId: string };
      const db = await getPool(tenantId);

      // Step 1: flip pending → overdue
      const flipped = await db.query(`
        UPDATE payment_installments
        SET status = 'overdue', updated_at = now()
        WHERE status = 'pending' AND due_date < CURRENT_DATE
        RETURNING id, lead_id, amount, due_date, installment_no
      `);
      if (flipped.rowCount) {
        logger.info({ tenantId, count: flipped.rowCount }, "Installments marked overdue");
      }

      // Step 2: overdue reminders (not sent today)
      const overdueRows = await db.query(`
        SELECT pi.id, pi.lead_id, pi.amount, pi.due_date, pi.installment_no,
               l.full_name AS lead_name, l.phone AS lead_phone
        FROM payment_installments pi
        JOIN leads l ON l.id = pi.lead_id
        WHERE pi.status = 'overdue'
          AND l.phone IS NOT NULL
          AND (pi.reminder_sent_at IS NULL OR pi.reminder_sent_at::date < CURRENT_DATE)
        LIMIT 200
      `);

      for (const row of overdueRows.rows) {
        try {
          const msg =
            `Hi ${row.lead_name}, your installment #${row.installment_no} of ₹${parseFloat(row.amount).toLocaleString("en-IN")} ` +
            `was due on ${new Date(row.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. ` +
            `Please clear this at the earliest. Contact us for any queries.`;
          await whatsappService.sendText(row.lead_phone, msg);
          await db.query(
            "UPDATE payment_installments SET reminder_sent_at = now() WHERE id = $1",
            [row.id]
          );
        } catch (err) {
          logger.warn({ tenantId, installmentId: row.id, err }, "Overdue WA reminder failed");
        }
      }

      // Step 3: upcoming in 3 days (not reminded yet)
      const upcomingRows = await db.query(`
        SELECT pi.id, pi.lead_id, pi.amount, pi.due_date, pi.installment_no,
               l.full_name AS lead_name, l.phone AS lead_phone
        FROM payment_installments pi
        JOIN leads l ON l.id = pi.lead_id
        WHERE pi.status = 'pending'
          AND pi.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days'
          AND l.phone IS NOT NULL
          AND pi.reminder_sent_at IS NULL
        LIMIT 200
      `);

      for (const row of upcomingRows.rows) {
        try {
          const msg =
            `Hi ${row.lead_name}, a friendly reminder that installment #${row.installment_no} of ` +
            `₹${parseFloat(row.amount).toLocaleString("en-IN")} is due on ` +
            `${new Date(row.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. ` +
            `Please arrange payment on time. Thank you!`;
          await whatsappService.sendText(row.lead_phone, msg);
          await db.query(
            "UPDATE payment_installments SET reminder_sent_at = now() WHERE id = $1",
            [row.id]
          );
        } catch (err) {
          logger.warn({ tenantId, installmentId: row.id, err }, "Upcoming WA reminder failed");
        }
      }

      logger.info(
        { tenantId, overdue: overdueRows.rowCount, upcoming: upcomingRows.rowCount },
        "Installment scan complete"
      );
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Installment job failed");
  });

  return worker;
}
