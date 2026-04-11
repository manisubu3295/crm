import { Redis } from "ioredis";
import { env } from "../env.js";
import { createConnection } from "net";

/** Whether Redis is reachable — set once at startup by probeRedis() */
let redisAvailable = false;
let _connection: Redis | null = null;

/** Fast TCP probe — resolves within 2s */
export async function probeRedis(): Promise<boolean> {
  const url = new URL(env.REDIS_URL.replace("redis://", "http://"));
  const host = url.hostname;
  const port = parseInt(url.port || "6379", 10);

  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => { socket.destroy(); resolve(false); }, 2000);
    socket.once("connect", () => { clearTimeout(timer); socket.destroy(); resolve(true); });
    socket.once("error",   () => { clearTimeout(timer); resolve(false); });
  });
}

export function setRedisAvailable(val: boolean): void {
  redisAvailable = val;
}

export function getRedisConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return _connection;
}

/** Stub that silently discards all operations when Redis is unavailable */
export const nullQueue = {
  add: async () => null,
  addBulk: async () => [],
  upsertJobScheduler: async () => null,
};

/**
 * Returns a real BullMQ Queue if Redis is available, or a null stub.
 * Uses deferred creation so module import never connects to Redis eagerly.
 */
export function makeQueue(
  QueueClass: typeof import("bullmq").Queue,
  name: string,
  opts: object
): import("bullmq").Queue | typeof nullQueue {
  if (!redisAvailable) return nullQueue;
  return new QueueClass(name, { ...opts, connection: getRedisConnection() });
}
