import { Queue } from "bullmq";
import { getRedisConnection, nullQueue } from "./redisClient.js";

let _redisAvailable = false;
export function setCommunicationRedisAvailable(v: boolean) { _redisAvailable = v; }

let _queue: Queue | null = null;

export function getCommunicationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-communication", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { count: 2000 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _queue;
}

/** Backwards-compat export used by services — null-safe when Redis unavailable */
export const communicationQueue = {
  add: async (...args: Parameters<Queue["add"]>) => {
    if (!_redisAvailable) return nullQueue.add();
    return getCommunicationQueue().add(...args);
  },
};
