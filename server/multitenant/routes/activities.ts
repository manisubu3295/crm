import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/activities/today-summary ───────────────────────
router.get("/today-summary", ...guard, async (req: TenantRequest, res) => {
  const { userId } = req.query as { userId?: string };
  const targetUser = userId ?? (req as any).user?.id;

  const [summary, byCounsellor] = await Promise.all([
    req.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE activity_type = 'call')::int          AS calls_today,
         COUNT(*) FILTER (WHERE activity_type = 'call'
           AND outcome IN ('reached','interested','not_interested'))::int AS calls_reached,
         COALESCE(SUM(duration_sec) FILTER (WHERE activity_type='call'), 0)::int AS total_call_sec,
         COUNT(*) FILTER (WHERE activity_type = 'whatsapp')::int      AS wa_sent_today,
         COUNT(DISTINCT lead_id)::int                                  AS unique_leads_contacted
       FROM activity_logs
       WHERE user_id = $1
         AND created_at::date = CURRENT_DATE`,
      [targetUser]
    ),
    // All counsellors today (for managers)
    req.db.query(`
      SELECT
        u.id, u.full_name,
        COUNT(al.id) FILTER (WHERE al.activity_type='call')::int                AS calls_today,
        COUNT(al.id) FILTER (WHERE al.activity_type='call'
          AND al.outcome IN ('reached','interested'))::int                       AS calls_reached,
        COUNT(DISTINCT al.lead_id)::int                                         AS leads_contacted,
        COALESCE(ct.calls_target, 0)::int                                       AS calls_target,
        ROUND(100.0 * COUNT(al.id) FILTER (WHERE al.activity_type='call') /
          NULLIF(ct.calls_target, 0), 0)                                        AS pct_calls
      FROM users u
      LEFT JOIN activity_logs al
        ON al.user_id = u.id AND al.created_at::date = CURRENT_DATE
      LEFT JOIN counsellor_targets ct
        ON ct.user_id = u.id
        AND ct.month = EXTRACT(MONTH FROM now())::int
        AND ct.year  = EXTRACT(YEAR  FROM now())::int
      WHERE u.role IN ('counsellor','manager') AND u.is_active = TRUE
      GROUP BY u.id, u.full_name, ct.calls_target
      ORDER BY calls_today DESC
    `),
  ]);

  res.json({ ok: true, data: { summary: summary.rows[0], byCounsellor: byCounsellor.rows } });
});

// ─── GET /api/activities?userId=&leadId=&type=&page= ─────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { userId, leadId, type, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (userId) { conds.push(`al.user_id = $${p++}`); params.push(userId); }
  if (leadId) { conds.push(`al.lead_id = $${p++}`); params.push(leadId); }
  if (type)   { conds.push(`al.activity_type = $${p++}`); params.push(type); }

  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT al.*, u.full_name AS counsellor_name, l.full_name AS lead_name
       FROM activity_logs al
       JOIN users u ON u.id = al.user_id
       LEFT JOIN leads l ON l.id = al.lead_id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM activity_logs al WHERE ${where}`, params),
  ]);

  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/activities ─────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, activity_type, duration_sec, outcome, notes } = req.body as Record<string, unknown>;

  if (!activity_type) {
    res.status(400).json({ ok: false, message: "activity_type required" }); return;
  }

  const row = await req.db.query(
    `INSERT INTO activity_logs (lead_id, user_id, activity_type, duration_sec, outcome, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [lead_id ?? null, user.id, activity_type, duration_sec ?? null, outcome ?? null, notes ?? null]
  );

  // Update lead.last_contacted_at if linked to a lead
  if (lead_id) {
    await req.db.query(
      "UPDATE leads SET last_contacted_at=now(), updated_at=now() WHERE id=$1",
      [lead_id]
    );
  }

  res.status(201).json({ ok: true, data: row.rows[0] });
});

export default router;
