import { Queue } from "bullmq";
import { getRedisConnection } from "./redisClient.js";

let _queue: Queue | null = null;

function getDigestQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-digest", { connection: getRedisConnection() });
  }
  return _queue;
}

/** Daily at 8 AM IST (UTC+5:30 = 02:30 UTC) — send manager digest */
export async function startDigestCron(tenantIds: string[]) {
  const q = getDigestQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `digest-${tenantId}`,
      { pattern: "30 2 * * *", tz: "Asia/Kolkata" },
      {
        name: "daily-digest",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } },
      }
    );
  }
}
