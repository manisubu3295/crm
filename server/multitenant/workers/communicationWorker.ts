import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { communicationService } from "../services/communicationService.js";
import logger from "../logger.js";

export function startCommunicationWorker() {
  const worker = new Worker(
    "crm-communication",
    async (job) => {
      const { tenantId, logId, channel, phone, email, fullName, subject, body } = job.data as {
        tenantId: string;
        logId: string;
        channel: string;
        phone: string;
        email?: string;
        fullName: string;
        subject?: string;
        body: string;
        leadId: string;
      };

      const db = await getPool(tenantId);

      await communicationService.dispatch({
        logId,
        channel,
        phone,
        email,
        fullName,
        subject,
        body,
        db,
      });

      // Update lead last_contacted_at
      await db.query(
        "UPDATE leads SET last_contacted_at = now(), updated_at = now() WHERE id = $1",
        [job.data.leadId]
      );

      // Recalculate lead score asynchronously
      const { leadScoringService } = await import("../services/leadScoringService.js");
      await leadScoringService.recalculate(db, job.data.leadId);

      logger.info({ logId, channel, tenantId }, "Message dispatched");
    },
    { connection: getRedisConnection(), concurrency: 20 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Communication job failed");
  });

  return worker;
}
