import { Queue } from "bullmq";
import { getRedisConnection } from "./redisClient.js";

let _queue: Queue | null = null;

function getSlaQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-sla", { connection: getRedisConnection() });
  }
  return _queue;
}

export async function startSlaCron(tenantIds: string[]) {
  const q = getSlaQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `sla-scan-${tenantId}`,
      { every: 15 * 60 * 1000 }, // every 15 min
      {
        name: "sla-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 10 } },
      }
    );
  }
}
