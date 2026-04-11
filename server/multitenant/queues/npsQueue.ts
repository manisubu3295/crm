import { Queue } from "bullmq";
import { getRedisConnection } from "./redisClient.js";

let _queue: Queue | null = null;

function getNpsQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-nps", { connection: getRedisConnection() });
  }
  return _queue;
}

/** Daily at 10 AM IST — scans completions from yesterday, sends NPS survey */
export async function startNpsCron(tenantIds: string[]) {
  const q = getNpsQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `nps-scan-${tenantId}`,
      { pattern: "30 4 * * *", tz: "Asia/Kolkata" },
      {
        name: "nps-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } },
      }
    );
  }
}

export { getNpsQueue };
