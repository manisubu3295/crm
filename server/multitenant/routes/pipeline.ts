import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/pipeline/insights  — summary counts for all buckets
router.get("/insights", ...guard, async (req: TenantRequest, res) => {
  const [paymentPending, interestedCold, stalePipeline, overdueFollowups] = await Promise.all([
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage = 'payment'
    `),
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage = 'interested'
        AND (last_contacted_at IS NULL OR last_contacted_at < now() - interval '24 hours')
    `),
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage IN ('contacted','qualified','demo')
        AND updated_at < now() - interval '7 days'
        AND stage NOT IN ('admitted','lost')
    `),
    req.db.query(`
      SELECT COUNT(*) FROM tasks
      WHERE status NOT IN ('done','cancelled')
        AND due_at < now()
    `),
  ]);

  res.json({
    ok: true,
    data: {
      paymentPending: parseInt(paymentPending.rows[0].count),
      interestedCold: parseInt(interestedCold.rows[0].count),
      stalePipeline:  parseInt(stalePipeline.rows[0].count),
      overdueFollowups: parseInt(overdueFollowups.rows[0].count),
    },
  });
});

// GET /api/pipeline/payment-pending  — leads stuck in payment stage
router.get("/payment-pending", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.city, l.lead_score,
      l.last_contacted_at, l.updated_at,
      EXTRACT(EPOCH FROM (now() - l.updated_at))/3600 AS hours_in_stage,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id,
      (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id) AS last_message_at,
      (SELECT cl.channel FROM communication_logs cl WHERE cl.lead_id = l.id ORDER BY cl.created_at DESC LIMIT 1) AS last_channel
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage = 'payment'
    ORDER BY l.updated_at ASC
    LIMIT 100
  `);
  res.json({ ok: true, data: rows.rows });
});

// GET /api/pipeline/interested-cold  — interested leads with no response
router.get("/interested-cold", ...guard, async (req: TenantRequest, res) => {
  const { threshold = "24" } = req.query as { threshold?: string };
  const hours = Math.max(1, parseInt(threshold));

  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.city, l.lead_score,
      l.last_contacted_at, l.updated_at, l.created_at,
      EXTRACT(EPOCH FROM (now() - COALESCE(l.last_contacted_at, l.created_at)))/3600 AS hours_no_response,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id,
      (SELECT COUNT(*) FROM communication_logs cl WHERE cl.lead_id = l.id AND cl.direction = 'inbound') AS reply_count,
      (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id ORDER BY cl.created_at DESC) AS last_message_at
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage = 'interested'
      AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' hours')::interval)
    ORDER BY COALESCE(l.last_contacted_at, l.created_at) ASC
    LIMIT 100
  `, [hours]);
  res.json({ ok: true, data: rows.rows });
});

// GET /api/pipeline/stale  — leads with no activity for N days
router.get("/stale", ...guard, async (req: TenantRequest, res) => {
  const { days = "7" } = req.query as { days?: string };
  const d = Math.max(1, parseInt(days));

  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.stage, l.lead_score,
      l.last_contacted_at, l.updated_at,
      EXTRACT(EPOCH FROM (now() - l.updated_at))/86400 AS days_stale,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage IN ('contacted','qualified','demo','interested')
      AND l.updated_at < now() - ($1 || ' days')::interval
    ORDER BY l.updated_at ASC
    LIMIT 100
  `, [d]);
  res.json({ ok: true, data: rows.rows });
});

// GET /api/pipeline/overdue-tasks  — overdue tasks with lead context
router.get("/overdue-tasks", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      t.id, t.title, t.task_type, t.priority, t.due_at, t.status,
      t.lead_id,
      l.full_name AS lead_name, l.phone AS lead_phone, l.stage AS lead_stage, l.lead_no,
      u.full_name AS assigned_to_name,
      EXTRACT(EPOCH FROM (now() - t.due_at))/3600 AS hours_overdue
    FROM tasks t
    JOIN leads l ON t.lead_id = l.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.status NOT IN ('done','cancelled')
      AND t.due_at < now()
    ORDER BY t.due_at ASC
    LIMIT 100
  `);
  res.json({ ok: true, data: rows.rows });
});

export default router;
