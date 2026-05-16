import { env } from "./env.js";
import { loadRegistry } from "./tenant/registry.js";
import { ensureAllTenantsReady } from "./tenant/ensureReady.js";
import { createApp } from "./server.js";
import { getRegistry }  from "./tenant/registry.js";
import { closeAllPools } from "./tenant/dbPool.js";
import logger from "./logger.js";
import { probeRedis } from "./queues/redisClient.js";
import { setAutomationRedisAvailable } from "./queues/automationQueue.js";
import { setCommunicationRedisAvailable } from "./queues/communicationQueue.js";
import { setFollowUpRedisAvailable } from "./queues/followUpQueue.js";

async function main() {
  logger.info({ nodeEnv: env.NODE_ENV }, "Starting Marcellotech CRM...");

  // 1. Load tenant registry
  loadRegistry();

  // 2. Run migrations for all tenants
  await ensureAllTenantsReady();

  // 3. Start BullMQ workers only if Redis is reachable
  const workers: Array<{ close: () => Promise<void> }> = [];
  const redisOk = await probeRedis();

  if (redisOk) {
    setAutomationRedisAvailable(true);
    setCommunicationRedisAvailable(true);
    setFollowUpRedisAvailable(true);

    const [
      { startAutomationWorker },
      { startCommunicationWorker },
      { startSlaWorker },
      { startFollowUpWorker },
      { startReEngagementWorker },
      { startInstallmentWorker },
      { startNpsWorker },
      { startDigestWorker },
      { startSlaCron },
      { startReEngagementCron },
      { startInstallmentCron },
      { startNpsCron },
      { startDigestCron },
    ] = await Promise.all([
      import("./workers/automationWorker.js"),
      import("./workers/communicationWorker.js"),
      import("./workers/slaWorker.js"),
      import("./workers/followUpWorker.js"),
      import("./workers/reEngagementWorker.js"),
      import("./workers/installmentWorker.js"),
      import("./workers/npsWorker.js"),
      import("./workers/digestWorker.js"),
      import("./queues/slaQueue.js"),
      import("./queues/reEngagementQueue.js"),
      import("./queues/installmentQueue.js"),
      import("./queues/npsQueue.js"),
      import("./queues/digestQueue.js"),
    ]);

    workers.push(
      startAutomationWorker(),
      startCommunicationWorker(),
      startSlaWorker(),
      startFollowUpWorker(),
      startReEngagementWorker(),
      startInstallmentWorker(),
      startNpsWorker(),
      startDigestWorker(),
    );
    logger.info({ count: workers.length }, "BullMQ workers started");

    const tenantIds = Object.keys(getRegistry().tenants);
    await Promise.all([
      startSlaCron(tenantIds),
      startReEngagementCron(tenantIds),
      startInstallmentCron(tenantIds),
      startNpsCron(tenantIds),
      startDigestCron(tenantIds),
    ]);
    logger.info("CRON jobs scheduled");
  } else {
    logger.warn(
      "Redis unavailable — BullMQ workers/crons skipped. Queued tasks (email, SMS, automation) will not run."
    );
  }

  // 4. Start HTTP + Socket.io server
  const { httpServer } = createApp();

  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, "CRM server listening");
      resolve();
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    await Promise.all(workers.map((w) => w.close()));
    await closeAllPools();
    httpServer.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT",  () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
