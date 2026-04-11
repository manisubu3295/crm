import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";
import { env } from "../env.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/notifications/vapid-key  — public VAPID key for push subscription
router.get("/vapid-key", ...guard, (_req, res) => {
  if (!env.VAPID_PUBLIC_KEY) {
    res.status(501).json({ ok: false, message: "Push notifications not configured" });
    return;
  }
  res.json({ ok: true, data: { publicKey: env.VAPID_PUBLIC_KEY } });
});

// POST /api/notifications/push-subscribe  — save push subscription
router.post("/push-subscribe", ...guard, async (req: TenantRequest, res) => {
  const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ ok: false, message: "Invalid push subscription" });
    return;
  }
  await req.db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [req.user!.sub, endpoint, keys.p256dh, keys.auth]
  );
  res.json({ ok: true });
});

// DELETE /api/notifications/push-subscribe  — remove push subscription
router.delete("/push-subscribe", ...guard, async (req: TenantRequest, res) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ ok: false, message: "endpoint required" }); return; }
  await req.db.query(
    "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
    [req.user!.sub, endpoint]
  );
  res.json({ ok: true });
});

// GET /api/notifications  — current user's notifications
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "30"), 100);
  const result = await req.db.query(
    `SELECT n.*, l.full_name AS lead_name, l.lead_no
     FROM notifications n
     LEFT JOIN leads l ON n.lead_id = l.id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [req.user!.sub, limit]
  );
  const unread = await req.db.query(
    "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
    [req.user!.sub]
  );
  res.json({ ok: true, data: result.rows, unreadCount: parseInt(unread.rows[0].count) });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", ...guard, async (req: TenantRequest, res) => {
  await req.db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    [req.user!.sub]
  );
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", ...guard, async (req: TenantRequest, res) => {
  await req.db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [req.params["id"], req.user!.sub]
  );
  res.json({ ok: true });
});

// DELETE /api/notifications  — clear all read
router.delete("/", ...guard, async (req: TenantRequest, res) => {
  await req.db.query(
    "DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE",
    [req.user!.sub]
  );
  res.json({ ok: true });
});

export default router;
