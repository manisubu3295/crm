import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/redisClient.js";
import { getTenantDb } from "../db/tenantDb.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

/**
 * Daily Digest Worker — fires at 8 AM IST.
 * Sends a morning summary to each manager/admin via WhatsApp:
 *   - New leads yesterday
 *   - Demos scheduled today
 *   - Overdue follow-up tasks
 *   - Counsellor calls yesterday vs target
 *   - Fees collected yesterday
 */
export function startDigestWorker() {
  const worker = new Worker(
    "crm-digest",
    async (job) => {
      if (job.name !== "daily-digest") return;
      const { tenantId } = job.data as { tenantId: string };
      const db = getTenantDb(tenantId);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().slice(0, 10);
      const today  = new Date().toISOString().slice(0, 10);

      const [newLeads, demosToday, overdueTasks, callStats, feesYesterday, managers] =
        await Promise.all([
          // New leads yesterday
          db.query(
            `SELECT COUNT(*) AS cnt FROM leads WHERE created_at::date = $1`,
            [yDate]
          ),
          // Demos today
          db.query(
            `SELECT COUNT(*) AS cnt FROM demo_sessions WHERE scheduled_at::date = $1 AND status='scheduled'`,
            [today]
          ),
          // Overdue open tasks
          db.query(
            `SELECT COUNT(*) AS cnt FROM tasks WHERE due_at < now() AND status NOT IN ('done','cancelled')`
          ),
          // Counsellor call stats yesterday
          db.query(
            `SELECT u.full_name, COUNT(a.id) AS calls,
                    ct.calls_target AS target
             FROM users u
             LEFT JOIN activity_logs a ON a.user_id = u.id
               AND a.activity_type = 'call'
               AND a.activity_date::date = $1
             LEFT JOIN counsellor_targets ct ON ct.user_id = u.id
             WHERE u.role = 'counsellor' AND u.is_active = TRUE
             GROUP BY u.full_name, ct.calls_target
             ORDER BY calls DESC`,
            [yDate]
          ),
          // Fees collected yesterday
          db.query(
            `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
             FROM payments WHERE status='completed' AND paid_at::date = $1`,
            [yDate]
          ),
          // Managers & admins with phones
          db.query(
            `SELECT full_name, phone FROM users
             WHERE role IN ('admin','manager') AND is_active = TRUE AND phone IS NOT NULL`
          ),
        ]);

      if (!managers.rows.length) {
        logger.info({ tenantId }, "Digest: no managers with phone, skipping");
        return;
      }

      const newLeadCnt  = parseInt(newLeads.rows[0].cnt);
      const demosCnt    = parseInt(demosToday.rows[0].cnt);
      const overdueTask = parseInt(overdueTasks.rows[0].cnt);
      const feesTotal   = parseFloat(feesYesterday.rows[0].total);
      const feesCnt     = parseInt(feesYesterday.rows[0].count);

      // Counsellor summary lines
      const callLines = callStats.rows
        .map((r: any) => `  • ${r.full_name}: ${r.calls}${r.target ? `/${r.target}` : ""} calls`)
        .join("\n");

      const dateStr = yesterday.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      const msg = [
        `📊 *Daily CRM Digest — ${dateStr}*`,
        ``,
        `🆕 New Leads: *${newLeadCnt}*`,
        `📅 Demos Today: *${demosCnt}*`,
        `⚠️ Overdue Tasks: *${overdueTask}*`,
        `💰 Fees Collected: *₹${feesTotal.toLocaleString("en-IN")}* (${feesCnt} payment${feesCnt !== 1 ? "s" : ""})`,
        ``,
        callLines ? `📞 Counsellor Calls (Yesterday):\n${callLines}` : null,
      ].filter(Boolean).join("\n");

      let sent = 0;
      for (const mgr of managers.rows) {
        try {
          await whatsappService.sendText(mgr.phone, msg);
          sent++;
        } catch (err) {
          logger.warn({ tenantId, manager: mgr.full_name, err }, "Digest send failed");
        }
      }

      logger.info({ tenantId, sent, managers: managers.rowCount }, "Daily digest sent");
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Digest worker job failed");
  });

  return worker;
}
