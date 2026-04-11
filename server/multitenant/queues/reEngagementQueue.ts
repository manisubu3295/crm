import { Queue } from "bullmq";
import { getRedisConnection } from "./redisClient.js";

let _queue: Queue | null = null;

function getReEngagementQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-reengagement", { connection: getRedisConnection() });
  }
  return _queue;
}

export async function startReEngagementCron(tenantIds: string[]) {
  const q = getReEngagementQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `reengagement-daily-${tenantId}`,
      { pattern: "0 9 * * *", tz: "Asia/Kolkata" },
      {
        name: "reengagement-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } },
      }
    );
  }
}
