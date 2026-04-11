import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/batches ─────────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { courseId, isActive, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg  = Math.max(1, parseInt(page));
  const lm  = Math.min(200, parseInt(limit));
  const off = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (courseId) { conds.push(`b.course_id = $${p++}`); params.push(courseId); }
  if (isActive !== undefined) { conds.push(`b.is_active = $${p++}`); params.push(isActive === "true"); }
  const where = conds.join(" AND ");

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT b.*, c.name AS course_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id) AS enrolled_count,
              b.capacity - (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id) AS seats_left
       FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE ${where}
       ORDER BY b.start_date DESC NULLS LAST, b.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM batches b WHERE ${where}`, params),
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/batches ────────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const { course_id, name, batch_type = "regular", mode = "offline", timing, start_date, end_date, capacity = 30, notes } = req.body as Record<string, unknown>;
  if (!course_id || !name) { res.status(400).json({ ok: false, message: "course_id and name required" }); return; }
  const row = await req.db.query(
    `INSERT INTO batches (course_id,name,batch_type,mode,timing,start_date,end_date,capacity,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [course_id, name, batch_type, mode, timing??null, start_date??null, end_date??null, capacity, notes??null]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/batches/:id ───────────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const f = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE batches SET
       name=COALESCE($2,name), batch_type=COALESCE($3,batch_type), mode=COALESCE($4,mode),
       timing=COALESCE($5,timing), start_date=COALESCE($6,start_date), end_date=COALESCE($7,end_date),
       capacity=COALESCE($8,capacity), is_active=COALESCE($9,is_active), notes=COALESCE($10,notes),
       updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, f.name??null, f.batch_type??null, f.mode??null, f.timing??null, f.start_date??null, f.end_date??null, f.capacity??null, f.is_active??null, f.notes??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── GET /api/batches/:id/enrollments ────────────────────────
router.get("/:id/enrollments", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(
    `SELECT e.*, l.full_name AS student_name, l.phone AS student_phone, l.email AS student_email,
            l.lead_no, l.lead_score
     FROM enrollments e
     JOIN leads l ON l.id = e.lead_id
     WHERE e.batch_id = $1
     ORDER BY e.enrolled_at DESC`,
    [req.params.id]
  );
  const batch = await req.db.query(
    `SELECT b.*, c.name AS course_name FROM batches b LEFT JOIN courses c ON c.id=b.course_id WHERE b.id=$1`,
    [req.params.id]
  );
  res.json({ ok: true, data: { batch: batch.rows[0], enrollments: rows.rows } });
});

// ─── POST /api/batches/:id/enroll ────────────────────────────
router.post("/:id/enroll", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, fee_amount = 0, notes } = req.body as Record<string, unknown>;
  if (!lead_id) { res.status(400).json({ ok: false, message: "lead_id required" }); return; }

  // Check capacity
  const capacityCheck = await req.db.query(
    `SELECT b.capacity, (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id=b.id) AS enrolled
     FROM batches b WHERE b.id=$1`,
    [req.params.id]
  );
  const batch = capacityCheck.rows[0];
  if (!batch) { res.status(404).json({ ok: false, message: "Batch not found" }); return; }
  if (parseInt(batch.enrolled) >= parseInt(batch.capacity)) {
    res.status(400).json({ ok: false, message: "Batch is full" }); return;
  }

  const row = await req.db.query(
    `INSERT INTO enrollments (lead_id, batch_id, fee_amount, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (lead_id, batch_id) DO UPDATE SET notes=EXCLUDED.notes RETURNING *`,
    [lead_id, req.params.id, fee_amount, notes??null]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/batches/enrollments/:enrollmentId ────────────
router.patch("/enrollments/:enrollmentId", ...guard, async (req: TenantRequest, res) => {
  const f = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE enrollments SET
       fee_amount=COALESCE($2,fee_amount), fee_paid=COALESCE($3,fee_paid),
       certificate_issued=COALESCE($4,certificate_issued), completion_date=COALESCE($5,completion_date),
       notes=COALESCE($6,notes)
     WHERE id=$1 RETURNING *`,
    [req.params.enrollmentId, f.fee_amount??null, f.fee_paid??null, f.certificate_issued??null, f.completion_date??null, f.notes??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── GET /api/batches/:id/timetable ──────────────────────────
router.get("/:id/timetable", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(
    `SELECT bs.*, u.full_name AS trainer_name
     FROM batch_sessions bs
     LEFT JOIN users u ON u.id = bs.trainer_id
     WHERE bs.batch_id = $1
     ORDER BY bs.day_of_week, bs.start_time`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── POST /api/batches/:id/timetable ─────────────────────────
router.post("/:id/timetable", ...guard, async (req: TenantRequest, res) => {
  const { day_of_week, start_time, end_time, topic, trainer_id, location, notes } =
    req.body as Record<string, unknown>;

  if (day_of_week === undefined || !start_time || !end_time) {
    res.status(400).json({ ok: false, message: "day_of_week, start_time, end_time required" }); return;
  }

  const row = await req.db.query(
    `INSERT INTO batch_sessions (batch_id, day_of_week, start_time, end_time, topic, trainer_id, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, day_of_week, start_time, end_time, topic ?? null,
     trainer_id ?? null, location ?? null, notes ?? null]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/batches/timetable/:sessionId ─────────────────
router.delete("/timetable/:sessionId", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM batch_sessions WHERE id=$1", [req.params.sessionId]);
  res.json({ ok: true });
});

// ─── POST /api/batches/enrollments/:enrollmentId/issue-cert ──
router.post("/enrollments/:enrollmentId/issue-cert", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };

  // Generate a cert number like CERT-2026-001234
  const seqRow = await req.db.query("SELECT nextval('cert_seq') AS val");
  const certNo = `CERT-${new Date().getFullYear()}-${String(seqRow.rows[0].val).padStart(6, "0")}`;

  const row = await req.db.query(
    `UPDATE enrollments
       SET certificate_issued = TRUE,
           cert_no            = $2,
           cert_issued_by     = $3,
           cert_issued_at     = now(),
           completion_date    = COALESCE(completion_date, now())
     WHERE id = $1
     RETURNING *`,
    [req.params.enrollmentId, certNo, user.id]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Enrollment not found" }); return; }

  const enr = row.rows[0];

  // Send WhatsApp congratulations
  try {
    const leadRow = await req.db.query(
      `SELECT l.full_name, l.phone, b.name AS batch_name, c.name AS course_name
       FROM leads l
       JOIN enrollments e ON e.lead_id = l.id
       JOIN batches b ON b.id = e.batch_id
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE e.id = $1`,
      [req.params.enrollmentId]
    );
    if (leadRow.rows[0]) {
      const { full_name, phone, batch_name, course_name } = leadRow.rows[0];
      const msg =
        `🎓 Congratulations, ${full_name}!\n` +
        `Your certificate for *${course_name ?? batch_name}* has been issued.\n` +
        `Certificate No: *${certNo}*\n` +
        `Date: ${new Date().toLocaleDateString("en-IN")}\n\n` +
        `We are proud of your achievement. All the best for your future!`;
      await whatsappService.sendText(phone, msg);
    }
  } catch (err) {
    logger.warn({ enrollmentId: req.params.enrollmentId, err }, "Certificate WhatsApp failed");
  }

  res.json({ ok: true, data: enr });
});

export default router;
