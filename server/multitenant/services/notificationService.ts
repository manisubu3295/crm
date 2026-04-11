import type { Pool } from "pg";
import type { Server as SocketIOServer } from "socket.io";
import { env } from "../env.js";
import { getIo } from "../lib/ioRegistry.js";
import logger from "../logger.js";

type NotifyPayload = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  leadId?: string;
  taskId?: string;
};

let webpush: typeof import("web-push") | null = null;

async function getWebPush() {
  if (webpush) return webpush;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  try {
    webpush = await import("web-push");
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    return webpush;
  } catch {
    return null;
  }
}

async function sendPushToUser(db: Pool, userId: string, title: string, body?: string, leadId?: string) {
  const wp = await getWebPush();
  if (!wp) return;

  const subs = await db.query(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );

  const payload = JSON.stringify({
    title,
    body: body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: leadId ? `/leads/${leadId}` : "/" },
  });

  for (const sub of subs.rows) {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
      } else {
        logger.warn({ err, endpoint: sub.endpoint }, "Push send failed");
      }
    }
  }
}

export const notificationService = {
  async create(db: Pool, ioOverride: SocketIOServer | null, tenantId: string, payload: NotifyPayload) {
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, lead_id, task_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        payload.userId, payload.type, payload.title,
        payload.body ?? null, payload.leadId ?? null, payload.taskId ?? null,
      ]
    );

    // Emit real-time socket event to user's room
    const io = ioOverride ?? getIo();
    if (io) {
      io.to(`user:${payload.userId}`).emit("notification", {
        id: result.rows[0].id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        leadId: payload.leadId,
        taskId: payload.taskId,
      });
    }

    // Send web push notification (fire-and-forget)
    sendPushToUser(db, payload.userId, payload.title, payload.body, payload.leadId).catch(() => {});

    return result.rows[0].id as string;
  },

  async notify(db: Pool, tenantId: string, userId: string, type: string, title: string, opts?: { body?: string; leadId?: string; taskId?: string }) {
    return notificationService.create(db, null, tenantId, {
      userId, type, title, ...opts,
    });
  },

  async notifyUser(db: Pool, io: SocketIOServer | null, tenantId: string, userId: string, type: string, title: string, opts?: { body?: string; leadId?: string; taskId?: string }) {
    return notificationService.create(db, io, tenantId, {
      userId, type, title, ...opts,
    });
  },

  async notifyRole(db: Pool, io: SocketIOServer | null, tenantId: string, role: string, type: string, title: string, opts?: { body?: string; leadId?: string }) {
    const users = await db.query(
      "SELECT id FROM users WHERE role = $1 AND is_active = TRUE",
      [role]
    );
    for (const u of users.rows) {
      await notificationService.create(db, io, tenantId, {
        userId: u.id, type, title, ...opts,
      });
    }
  },
};
