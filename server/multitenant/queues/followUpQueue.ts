import { Queue } from "bullmq";
import { getRedisConnection, nullQueue } from "./redisClient.js";

let _redisAvailable = false;
export function setFollowUpRedisAvailable(v: boolean) { _redisAvailable = v; }

let _queue: Queue | null = null;

export function getFollowUpQueue(): Queue {
  if (!_queue) {
    _queue = new Queue("crm-followup", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 10000 },
        removeOnComplete: { count: 500 },
      },
    });
  }
  return _queue;
}

export const followUpQueue = {
  add: async (...args: Parameters<Queue["add"]>) => {
    if (!_redisAvailable) return nullQueue.add();
    return getFollowUpQueue().add(...args);
  },
};
