import { Queue } from "bullmq";
import { getRedisConnection } from "./redisClient.js";

let _queue: Queue | null = null;

function getInstallmentQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-installments", { connection: getRedisConnection() });
  }
  return _queue;
}

/** Daily at 9 AM IST (UTC+5:30 = 03:30 UTC) */
export async function startInstallmentCron(tenantIds: string[]) {
  const q = getInstallmentQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `installment-scan-${tenantId}`,
      { pattern: "30 3 * * *", tz: "Asia/Kolkata" },
      {
        name: "installment-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } },
      }
    );
  }
}
