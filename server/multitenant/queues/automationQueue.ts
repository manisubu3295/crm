import { Queue } from "bullmq";
import { getRedisConnection, nullQueue } from "./redisClient.js";

let _redisAvailable = false;
export function setAutomationRedisAvailable(v: boolean) { _redisAvailable = v; }

let _queue: Queue | null = null;

export function getAutomationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-automation", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _queue;
}

/** Backwards-compat export used by services — null-safe when Redis unavailable */
export const automationQueue = {
  add: async (...args: Parameters<Queue["add"]>) => {
    if (!_redisAvailable) return nullQueue.add();
    return getAutomationQueue().add(...args);
  },
};
