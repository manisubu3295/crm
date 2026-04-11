import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/students  — admitted leads with student-centric columns
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { search, courseId, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg - 1) * lm;

  const conditions: string[] = ["l.stage = 'admitted'"];
  const params: unknown[] = [];
  let p = 1;

  if (search) {
    conditions.push(`(l.full_name ILIKE $${p} OR l.phone ILIKE $${p} OR l.email ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }
  if (courseId) { conditions.push(`l.course_id = $${p++}`); params.push(courseId); }
  if (assignedTo) { conditions.push(`l.assigned_to = $${p++}`); params.push(assignedTo); }

  const where = conditions.join(" AND ");

  const [rows, countRow] = await Promise.all([
    req.db.query(
      `SELECT
         l.id, l.lead_no, l.full_name, l.phone, l.email, l.city,
         l.qualification, l.stage, l.lead_score, l.admitted_at,
         l.last_contacted_at, l.created_at,
         c.name  AS course_name,
         u.full_name AS counsellor_name,
         u.id AS counsellor_id,
         (SELECT COUNT(*) FROM communication_logs cl WHERE cl.lead_id = l.id) AS total_messages,
         (SELECT COUNT(*) FROM tasks t WHERE t.lead_id = l.id AND t.status = 'done') AS tasks_done,
         (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id) AS last_message_at
       FROM leads l
       LEFT JOIN courses c ON l.course_id = c.id
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE ${where}
       ORDER BY l.admitted_at DESC NULLS LAST, l.updated_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(
      `SELECT COUNT(*) FROM leads l WHERE ${where}`,
      params
    ),
  ]);

  const total = parseInt(countRow.rows[0].count);
  res.json({ ok: true, data: rows.rows, meta: { total, page: pg, limit: lm } });
});

// GET /api/students/stats  — summary counts for the students dashboard
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [total, thisMonth, byCourse, byCounsellor] = await Promise.all([
    req.db.query("SELECT COUNT(*) FROM leads WHERE stage = 'admitted'"),
    req.db.query("SELECT COUNT(*) FROM leads WHERE stage = 'admitted' AND admitted_at >= $1", [monthStart]),
    req.db.query(
      `SELECT c.name AS course, COUNT(l.id) AS count
       FROM leads l JOIN courses c ON l.course_id = c.id
       WHERE l.stage = 'admitted'
       GROUP BY c.name ORDER BY count DESC LIMIT 8`
    ),
    req.db.query(
      `SELECT u.full_name AS counsellor, COUNT(l.id) AS count
       FROM leads l JOIN users u ON l.assigned_to = u.id
       WHERE l.stage = 'admitted'
       GROUP BY u.full_name ORDER BY count DESC LIMIT 8`
    ),
  ]);

  res.json({
    ok: true,
    data: {
      total: parseInt(total.rows[0].count),
      thisMonth: parseInt(thisMonth.rows[0].count),
      byCourse: byCourse.rows,
      byCounsellor: byCounsellor.rows,
    },
  });
});

export default router;
