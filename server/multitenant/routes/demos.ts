import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { followUpQueue } from "../queues/followUpQueue.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/demos?leadId=&status=&upcoming= ─────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { leadId, status, upcoming } = req.query as Record<string, string>;
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (leadId)  { conds.push(`ds.lead_id = $${p++}`); params.push(leadId); }
  if (status)  { conds.push(`ds.status = $${p++}`);  params.push(status); }
  if (upcoming === "1") {
    conds.push(`ds.scheduled_at >= now()`);
    conds.push(`ds.status = 'scheduled'`);
  }

  const rows = await req.db.query(
    `SELECT ds.*,
            l.full_name   AS lead_name,  l.phone AS lead_phone,
            c.full_name   AS counsellor_name,
            t.full_name   AS trainer_name,
            b.name        AS batch_name
     FROM demo_sessions ds
     JOIN leads l ON l.id = ds.lead_id
     LEFT JOIN users c ON c.id = ds.counsellor_id
     LEFT JOIN users t ON t.id = ds.trainer_id
     LEFT JOIN batches b ON b.id = ds.batch_id
     WHERE ${conds.join(" AND ")}
     ORDER BY ds.scheduled_at DESC
     LIMIT 200`,
    params
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/demos/stats ─────────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at >= now())::int  AS upcoming,
      COUNT(*) FILTER (WHERE status = 'completed')::int                            AS completed,
      COUNT(*) FILTER (WHERE status = 'no_show')::int                             AS no_shows,
      COUNT(*) FILTER (WHERE outcome IN ('interested','enrolled'))::int            AS interested,
      COUNT(*) FILTER (WHERE outcome = 'enrolled')::int                           AS enrolled,
      COUNT(*)::int                                                                AS total,
      ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('completed','no_show')),0), 1)   AS show_rate,
      ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IN ('interested','enrolled')) /
        NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0), 1)              AS conversion_rate
    FROM demo_sessions
  `);
  res.json({ ok: true, data: rows.rows[0] });
});

// ─── POST /api/demos ──────────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const {
    lead_id, batch_id, scheduled_at, duration_min = 60,
    mode = "offline", location, counsellor_id, trainer_id, notes,
  } = req.body as Record<string, unknown>;

  if (!lead_id || !scheduled_at) {
    res.status(400).json({ ok: false, message: "lead_id and scheduled_at required" });
    return;
  }

  const row = await req.db.query(
    `INSERT INTO demo_sessions
       (lead_id, batch_id, scheduled_at, duration_min, mode, location,
        counsellor_id, trainer_id, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [lead_id, batch_id ?? null, scheduled_at, duration_min, mode,
     location ?? null, counsellor_id ?? null, trainer_id ?? null,
     notes ?? null, user.id]
  );
  const demo = row.rows[0];

  // Fetch lead for WhatsApp reminder context
  const leadRow = await req.db.query(
    "SELECT full_name, phone FROM leads WHERE id = $1",
    [lead_id]
  );
  const lead = leadRow.rows[0];

  // Schedule BullMQ reminders (24h + 1h before) using followUpQueue job pattern
  const demoTime = new Date(String(scheduled_at)).getTime();
  const now      = Date.now();

  const jobBase = {
    demoId: demo.id,
    leadId: lead_id,
    leadName: lead?.full_name,
    leadPhone: lead?.phone,
    tenantId: req.tenantId,
    scheduledAt: scheduled_at,
    mode,
    location: location ?? null,
  };

  let job24Id: string | undefined;
  let job1Id:  string | undefined;

  const delay24 = demoTime - now - 24 * 3600 * 1000;
  if (delay24 > 0) {
    const j = await followUpQueue.add("demo-reminder", jobBase, { delay: delay24 });
    job24Id = j?.id ?? undefined;
  }

  const delay1 = demoTime - now - 1 * 3600 * 1000;
  if (delay1 > 0) {
    const j = await followUpQueue.add("demo-reminder", jobBase, { delay: delay1 });
    job1Id = j?.id ?? undefined;
  }

  // Persist job ids so we can remove them if demo is cancelled
  if (job24Id || job1Id) {
    await req.db.query(
      "UPDATE demo_sessions SET reminder_24h_job=$2, reminder_1h_job=$3 WHERE id=$1",
      [demo.id, job24Id ?? null, job1Id ?? null]
    );
  }

  // Auto-advance lead stage to 'demo' if earlier
  const stageOrder = ["new","contacted","qualified","demo","interested","payment","admitted"];
  const leadStage = (await req.db.query("SELECT stage FROM leads WHERE id=$1", [lead_id])).rows[0]?.stage;
  if (stageOrder.indexOf(leadStage) < stageOrder.indexOf("demo")) {
    await req.db.query(
      "UPDATE leads SET stage='demo', updated_at=now() WHERE id=$1",
      [lead_id]
    );
    await req.db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,'demo',$2,'Demo scheduled')",
      [lead_id, user.id]
    );
  }

  res.status(201).json({ ok: true, data: { ...demo, reminder_24h_job: job24Id, reminder_1h_job: job1Id } });
});

// ─── PATCH /api/demos/:id — update status / outcome ──────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const { status, outcome, notes, location, scheduled_at } = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE demo_sessions
     SET status       = COALESCE($2, status),
         outcome      = COALESCE($3, outcome),
         notes        = COALESCE($4, notes),
         location     = COALESCE($5, location),
         scheduled_at = COALESCE($6::timestamptz, scheduled_at),
         updated_at   = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, status ?? null, outcome ?? null, notes ?? null,
     location ?? null, scheduled_at ?? null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/demos/:id — cancel & remove BullMQ jobs ─────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  const existing = await req.db.query("SELECT * FROM demo_sessions WHERE id=$1", [req.params.id]);
  if (!existing.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }

  await req.db.query(
    "UPDATE demo_sessions SET status='cancelled', updated_at=now() WHERE id=$1",
    [req.params.id]
  );
  res.json({ ok: true });
});

export default router;
