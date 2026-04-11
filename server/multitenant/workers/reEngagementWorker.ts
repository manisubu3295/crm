import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { communicationService } from "../services/communicationService.js";
import logger from "../logger.js";

export function startReEngagementWorker() {
  const worker = new Worker(
    "crm-reengagement",
    async (job) => {
      const { tenantId } = job.data as { tenantId: string };
      const db = await getPool(tenantId);

      // Find active re-engagement campaigns
      const campaigns = await db.query(
        "SELECT * FROM reengagement_campaigns WHERE is_active = TRUE"
      );

      for (const campaign of campaigns.rows) {
        // Find dormant leads matching criteria
        const dormantLeads = await db.query(
          `SELECT l.id, l.phone, l.email, l.full_name
           FROM leads l
           WHERE l.re_engagement_eligible = TRUE
             AND l.stage NOT IN ('admitted', 'lost')
             ${campaign.target_stage ? "AND l.stage = $2" : ""}
             AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
             AND NOT EXISTS (
               SELECT 1 FROM reengagement_log rl
               WHERE rl.lead_id = l.id
                 AND rl.campaign_id = $${campaign.target_stage ? 3 : 2}
                 AND rl.attempt_number >= $${campaign.target_stage ? 4 : 3}
             )
           LIMIT 100`,
          campaign.target_stage
            ? [campaign.dormant_days, campaign.target_stage, campaign.id, campaign.max_attempts]
            : [campaign.dormant_days, campaign.id, campaign.max_attempts]
        );

        let sentCount = 0;
        for (const lead of dormantLeads.rows) {
          try {
            // Get attempt count
            const attempt = await db.query(
              "SELECT COALESCE(MAX(attempt_number), 0) AS last_attempt FROM reengagement_log WHERE lead_id = $1 AND campaign_id = $2",
              [lead.id, campaign.id]
            );
            const attemptNum = parseInt(attempt.rows[0].last_attempt) + 1;

            if (attemptNum > campaign.max_attempts) continue;

            // Send message via the campaign channel
            if (campaign.template_id) {
              await communicationService.send(db, tenantId, {
                leadId: lead.id,
                channel: campaign.channel,
                templateId: campaign.template_id,
                body: "",
              });
            }

            // Log the re-engagement attempt
            await db.query(
              `INSERT INTO reengagement_log (campaign_id, lead_id, attempt_number)
               VALUES ($1,$2,$3)`,
              [campaign.id, lead.id, attemptNum]
            );

            sentCount++;
          } catch (err) {
            logger.warn({ err, leadId: lead.id }, "Re-engagement send failed");
          }
        }

        if (sentCount > 0) {
          logger.info({ tenantId, campaignId: campaign.id, sentCount }, "Re-engagement batch sent");
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Re-engagement job failed");
  });

  return worker;
}
