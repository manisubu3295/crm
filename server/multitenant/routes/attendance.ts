import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/attendance/:enrollmentId ───────────────────────
router.get("/:enrollmentId", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(
    "SELECT * FROM attendance WHERE enrollment_id = $1 ORDER BY date DESC",
    [req.params.enrollmentId]
  );
  const summary = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status='present') AS present,
       COUNT(*) FILTER (WHERE status='absent')  AS absent,
       COUNT(*) FILTER (WHERE status='late')    AS late,
       COUNT(*) FILTER (WHERE status='excused') AS excused,
       COUNT(*)                                  AS total
     FROM attendance WHERE enrollment_id = $1`,
    [req.params.enrollmentId]
  );
  res.json({ ok: true, data: { records: rows.rows, summary: summary.rows[0] } });
});

// ─── POST /api/attendance ─────────────────────────────────────
// Body: { enrollment_id, date, status, notes }  OR  { batch_id, date, records: [{enrollment_id, status}] }
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const { enrollment_id, date, status = "present", notes, batch_id, records } = req.body as Record<string, unknown>;

  // Bulk mark for entire batch
  if (batch_id && Array.isArray(records) && date) {
    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (const r of records as Array<{ enrollment_id: string; status: string; notes?: string }>) {
      values.push(`($${p++},$${p++},$${p++},$${p++})`);
      params.push(r.enrollment_id, date, r.status ?? "present", r.notes ?? null);
    }
    if (values.length) {
      await req.db.query(
        `INSERT INTO attendance (enrollment_id, date, status, notes) VALUES ${values.join(",")}
         ON CONFLICT (enrollment_id, date) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes`,
        params
      );
    }
    res.json({ ok: true, data: { marked: values.length } });
    return;
  }

  // Single record
  if (!enrollment_id || !date) {
    res.status(400).json({ ok: false, message: "enrollment_id and date required" }); return;
  }
  const row = await req.db.query(
    `INSERT INTO attendance (enrollment_id, date, status, notes) VALUES ($1,$2,$3,$4)
     ON CONFLICT (enrollment_id, date) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes
     RETURNING *`,
    [enrollment_id, date, status, notes ?? null]
  );
  res.json({ ok: true, data: row.rows[0] });
});

// ─── GET /api/attendance/batch/:batchId/summary?date= ────────
router.get("/batch/:batchId/summary", ...guard, async (req: TenantRequest, res) => {
  const { date } = req.query as { date?: string };
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const rows = await req.db.query(
    `SELECT e.id AS enrollment_id, l.full_name AS student_name, l.phone AS student_phone,
            a.status, a.notes
     FROM enrollments e
     JOIN leads l ON l.id = e.lead_id
     LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = $2
     WHERE e.batch_id = $1
     ORDER BY l.full_name`,
    [req.params.batchId, targetDate]
  );

  const totalPresent = rows.rows.filter((r: any) => r.status === "present").length;
  const totalAbsent  = rows.rows.filter((r: any) => r.status === "absent").length;
  const totalMarked  = rows.rows.filter((r: any) => r.status !== null).length;

  res.json({
    ok: true,
    data: {
      date: targetDate,
      roll: rows.rows,
      summary: { total: rows.rows.length, present: totalPresent, absent: totalAbsent, marked: totalMarked },
    },
  });
});

// ─── GET /api/attendance/certificates/list?batchId= ─────────
router.get("/certificates/list", ...guard, async (req: TenantRequest, res) => {
  const { batchId, leadId } = req.query as { batchId?: string; leadId?: string };
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (batchId) { conds.push(`c.enrollment_id IN (SELECT id FROM enrollments WHERE batch_id=$${p++})`); params.push(batchId); }
  if (leadId)  { conds.push(`c.lead_id = $${p++}`); params.push(leadId); }

  const rows = await req.db.query(
    `SELECT c.*, l.full_name AS student_name, l.phone AS student_phone
     FROM certificates c JOIN leads l ON l.id = c.lead_id
     WHERE ${conds.join(" AND ")}
     ORDER BY c.issued_at DESC`,
    params
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── POST /api/attendance/certificates ───────────────────────
router.post("/certificates", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, enrollment_id, course_name, issued_at, dispatch_mode = "email", notes } = req.body as Record<string, unknown>;
  if (!lead_id || !course_name) { res.status(400).json({ ok: false, message: "lead_id and course_name required" }); return; }

  const certNoRow = await req.db.query("SELECT nextval('cert_no_seq') AS n");
  const certNo = `CERT-${new Date().getFullYear()}-${String(certNoRow.rows[0].n).padStart(4, "0")}`;

  const row = await req.db.query(
    `INSERT INTO certificates (lead_id, enrollment_id, cert_no, course_name, issued_at, dispatch_mode, notes)
     VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7) RETURNING *`,
    [lead_id, enrollment_id??null, certNo, course_name, issued_at??null, dispatch_mode, notes??null]
  );

  if (enrollment_id) {
    await req.db.query("UPDATE enrollments SET certificate_issued=true WHERE id=$1", [enrollment_id]);
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/attendance/certificates/:id/dispatch ─────────
router.patch("/certificates/:id/dispatch", ...guard, async (req: TenantRequest, res) => {
  const { dispatch_mode } = req.body as { dispatch_mode?: string };
  const row = await req.db.query(
    `UPDATE certificates SET dispatched_at=now(), dispatch_mode=COALESCE($2,dispatch_mode) WHERE id=$1 RETURNING *`,
    [req.params.id, dispatch_mode??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

export default router;
