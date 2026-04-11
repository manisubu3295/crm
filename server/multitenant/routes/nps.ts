import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/nps ─────────────────────────────────────────────
// List responses with filters: courseId, batchId, fromDate, toDate
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { courseId, batchId, fromDate, toDate, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, parseInt(limit));
  const off = (pg - 1) * lm;
  let p = 1;
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  if (courseId) { conds.push(`n.course_id = $${p++}`); params.push(courseId); }
  if (batchId)  { conds.push(`n.batch_id = $${p++}`);  params.push(batchId); }
  if (fromDate) { conds.push(`n.created_at >= $${p++}`); params.push(fromDate); }
  if (toDate)   { conds.push(`n.created_at <= $${p++}`); params.push(toDate); }
  const where = conds.join(" AND ");

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT n.*, l.full_name AS student_name, l.phone AS student_phone,
              c.name AS course_name, b.name AS batch_name
       FROM nps_responses n
       JOIN leads l ON l.id = n.lead_id
       LEFT JOIN courses c ON c.id = n.course_id
       LEFT JOIN batches b ON b.id = n.batch_id
       WHERE ${where}
       ORDER BY n.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM nps_responses n WHERE ${where}`, params),
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── GET /api/nps/stats ───────────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const { courseId, batchId, fromDate, toDate } = req.query as Record<string, string>;
  let p = 1;
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  if (courseId) { conds.push(`course_id = $${p++}`); params.push(courseId); }
  if (batchId)  { conds.push(`batch_id = $${p++}`);  params.push(batchId); }
  if (fromDate) { conds.push(`created_at >= $${p++}`); params.push(fromDate); }
  if (toDate)   { conds.push(`created_at <= $${p++}`); params.push(toDate); }
  const where = conds.join(" AND ");

  const [overall, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE responded_at IS NOT NULL) AS responses,
         COUNT(*) AS sent,
         ROUND(AVG(score) FILTER (WHERE responded_at IS NOT NULL), 2) AS avg_score,
         COUNT(*) FILTER (WHERE category='promoter') AS promoters,
         COUNT(*) FILTER (WHERE category='passive')  AS passives,
         COUNT(*) FILTER (WHERE category='detractor') AS detractors,
         ROUND(
           (COUNT(*) FILTER (WHERE category='promoter') - COUNT(*) FILTER (WHERE category='detractor'))::numeric
           / NULLIF(COUNT(*) FILTER (WHERE responded_at IS NOT NULL), 0) * 100
         , 1) AS nps_score
       FROM nps_responses WHERE ${where}`,
      params
    ),
    req.db.query(
      `SELECT c.name AS course_name, c.id AS course_id,
              COUNT(*) FILTER (WHERE n.responded_at IS NOT NULL) AS responses,
              ROUND(AVG(n.score) FILTER (WHERE n.responded_at IS NOT NULL), 2) AS avg_score,
              ROUND(
                (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
                / NULLIF(COUNT(*) FILTER (WHERE n.responded_at IS NOT NULL), 0) * 100
              , 1) AS nps_score
       FROM nps_responses n
       LEFT JOIN courses c ON c.id = n.course_id
       WHERE ${where}
       GROUP BY c.id, c.name
       ORDER BY nps_score DESC NULLS LAST`
      , params
    ),
  ]);

  res.json({ ok: true, data: { overall: overall.rows[0], byCourse: byCourse.rows } });
});

// ─── POST /api/nps/send ───────────────────────────────────────
// Manually trigger NPS survey for a specific enrollment
router.post("/send", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, batch_id, course_id } = req.body as Record<string, string>;
  if (!lead_id) { res.status(400).json({ ok: false, message: "lead_id required" }); return; }

  const lead = await req.db.query("SELECT full_name, phone FROM leads WHERE id=$1", [lead_id]);
  if (!lead.rows[0]) { res.status(404).json({ ok: false, message: "Lead not found" }); return; }

  const row = await req.db.query(
    `INSERT INTO nps_responses (lead_id, batch_id, course_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [lead_id, batch_id ?? null, course_id ?? null]
  );

  const { full_name, phone } = lead.rows[0];
  const msg =
    `Hi ${full_name}, thank you for completing your course with us! 🎓\n` +
    `On a scale of 0–10, how likely are you to recommend us to a friend?\n` +
    `Reply with your score (0-10) and any feedback.`;

  try {
    await whatsappService.sendText(phone, msg);
    logger.info({ leadId: lead_id }, "NPS survey sent");
  } catch (err) {
    logger.warn({ leadId: lead_id, err }, "NPS WhatsApp send failed");
  }

  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── POST /api/nps/respond ────────────────────────────────────
// Called by webhook / manually to record a response
router.post("/respond", async (req, res) => {
  const { phone, score, comment } = req.body as Record<string, unknown>;
  if (phone === undefined || score === undefined) {
    res.status(400).json({ ok: false, message: "phone and score required" }); return;
  }
  const sc = parseInt(String(score));
  if (isNaN(sc) || sc < 0 || sc > 10) {
    res.status(400).json({ ok: false, message: "score must be 0-10" }); return;
  }

  // Find latest pending NPS for this phone
  const leadRow = await (req as any).db?.query("SELECT id FROM leads WHERE phone=$1 LIMIT 1", [phone]);
  if (!leadRow?.rows[0]) { res.status(404).json({ ok: false, message: "Lead not found" }); return; }

  const leadId = leadRow.rows[0].id;
  const updated = await (req as any).db.query(
    `UPDATE nps_responses SET score=$2, comment=$3, responded_at=now()
     WHERE lead_id=$1 AND responded_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
     RETURNING *`,
    [leadId, sc, comment ?? null]
  );

  res.json({ ok: true, data: updated.rows[0] ?? null });
});

// ─── GET /api/nps/:id ─────────────────────────────────────────
router.get("/:id", ...guard, async (req: TenantRequest, res) => {
  const row = await req.db.query(
    `SELECT n.*, l.full_name AS student_name, l.phone AS student_phone,
            c.name AS course_name, b.name AS batch_name
     FROM nps_responses n
     JOIN leads l ON l.id = n.lead_id
     LEFT JOIN courses c ON c.id = n.course_id
     LEFT JOIN batches b ON b.id = n.batch_id
     WHERE n.id = $1`,
    [req.params.id]
  );
  if (!row.rows[0]) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

export default router;
