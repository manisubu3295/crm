import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";
import { whatsappService } from "../services/whatsappService.js";
import logger from "../logger.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/broadcasts ──────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(
    `SELECT b.*, u.full_name AS created_by_name
     FROM broadcasts b
     LEFT JOIN users u ON u.id = b.created_by
     ORDER BY b.created_at DESC LIMIT 100`
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── POST /api/broadcasts — create & preview ─────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { name, message_body, template_id, filters = {} } = req.body as Record<string, unknown>;
  if (!name || !message_body) {
    res.status(400).json({ ok: false, message: "name and message_body required" }); return;
  }

  // Build lead query from filters
  const { stage, courseId, batchId, source, assignedTo } =
    filters as Record<string, string | undefined>;

  const conds: string[] = ["l.phone IS NOT NULL AND l.phone != ''"];
  const params: unknown[] = [];
  let p = 1;
  if (stage)      { conds.push(`l.stage = $${p++}`);       params.push(stage); }
  if (courseId)   { conds.push(`l.course_id = $${p++}`);   params.push(courseId); }
  if (source)     { conds.push(`l.source = $${p++}`);      params.push(source); }
  if (assignedTo) { conds.push(`l.assigned_to = $${p++}`); params.push(assignedTo); }
  if (batchId)    {
    conds.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.lead_id = l.id AND e.batch_id = $${p++})`);
    params.push(batchId);
  }

  const count = await req.db.query(
    `SELECT COUNT(*) FROM leads l WHERE ${conds.join(" AND ")}`,
    params
  );

  const row = await req.db.query(
    `INSERT INTO broadcasts (name, channel, message_body, template_id, filters, total_count, created_by)
     VALUES ($1,'whatsapp',$2,$3,$4,$5,$6) RETURNING *`,
    [name, message_body, template_id ?? null, JSON.stringify(filters),
     parseInt(count.rows[0].count), user.id]
  );

  res.status(201).json({ ok: true, data: row.rows[0], preview: { recipientCount: parseInt(count.rows[0].count) } });
});

// ─── POST /api/broadcasts/:id/send — execute broadcast ───────
router.post("/:id/send", ...guard, async (req: TenantRequest, res) => {
  const bc = await req.db.query("SELECT * FROM broadcasts WHERE id=$1", [req.params.id]);
  if (!bc.rows[0]) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  const broadcast = bc.rows[0];

  if (!["draft", "failed"].includes(broadcast.status)) {
    res.status(400).json({ ok: false, message: `Cannot send broadcast in status: ${broadcast.status}` }); return;
  }

  // Mark as running
  await req.db.query(
    "UPDATE broadcasts SET status='running', started_at=now() WHERE id=$1",
    [req.params.id]
  );

  // Respond immediately — sending happens async
  res.json({ ok: true, message: "Broadcast started" });

  // Resolve recipients from stored filters
  const filters = broadcast.filters as Record<string, string | undefined>;
  const { stage, courseId, batchId, source, assignedTo } = filters;

  const conds: string[] = ["l.phone IS NOT NULL AND l.phone != ''"];
  const params: unknown[] = [];
  let p = 1;
  if (stage)      { conds.push(`l.stage = $${p++}`);       params.push(stage); }
  if (courseId)   { conds.push(`l.course_id = $${p++}`);   params.push(courseId); }
  if (source)     { conds.push(`l.source = $${p++}`);      params.push(source); }
  if (assignedTo) { conds.push(`l.assigned_to = $${p++}`); params.push(assignedTo); }
  if (batchId)    {
    conds.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.lead_id = l.id AND e.batch_id = $${p++})`);
    params.push(batchId);
  }

  const leads = await req.db.query(
    `SELECT l.id, l.phone, l.full_name FROM leads l WHERE ${conds.join(" AND ")}`,
    params
  );

  // Insert recipient rows
  if (leads.rows.length) {
    const vals = leads.rows.map((_: any, i: number) =>
      `($1,$${i * 2 + 2},$${i * 2 + 3})`
    ).join(",");
    const rParams: unknown[] = [req.params.id];
    leads.rows.forEach((l: any) => { rParams.push(l.id, l.phone); });
    await req.db.query(
      `INSERT INTO broadcast_recipients (broadcast_id, lead_id, phone)
       VALUES ${vals} ON CONFLICT DO NOTHING`,
      rParams
    );
  }

  // Send with throttle (50ms between messages to respect WhatsApp rate limits)
  let sent = 0, failed = 0;
  for (const lead of leads.rows) {
    try {
      const body = broadcast.message_body.replace(/\{\{name\}\}/gi, lead.full_name);
      await whatsappService.sendText(lead.phone, body);
      await req.db.query(
        "UPDATE broadcast_recipients SET status='sent', sent_at=now() WHERE broadcast_id=$1 AND lead_id=$2",
        [req.params.id, lead.id]
      );
      sent++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await req.db.query(
        "UPDATE broadcast_recipients SET status='failed', error_msg=$3 WHERE broadcast_id=$1 AND lead_id=$2",
        [req.params.id, lead.id, errMsg]
      );
      failed++;
      logger.warn({ broadcastId: req.params.id, leadId: lead.id, err }, "Broadcast send failed");
    }
    // Throttle
    await new Promise((r) => setTimeout(r, 50));
  }

  await req.db.query(
    `UPDATE broadcasts SET status='completed', completed_at=now(),
     sent_count=$2, failed_count=$3, total_count=$4 WHERE id=$1`,
    [req.params.id, sent, failed, sent + failed]
  );

  logger.info({ broadcastId: req.params.id, sent, failed }, "Broadcast completed");
});

// ─── GET /api/broadcasts/:id — detail + recipients ───────────
router.get("/:id", ...guard, async (req: TenantRequest, res) => {
  const [bc, recipients] = await Promise.all([
    req.db.query(
      `SELECT b.*, u.full_name AS created_by_name
       FROM broadcasts b LEFT JOIN users u ON u.id = b.created_by
       WHERE b.id=$1`,
      [req.params.id]
    ),
    req.db.query(
      `SELECT br.*, l.full_name AS lead_name
       FROM broadcast_recipients br
       JOIN leads l ON l.id = br.lead_id
       WHERE br.broadcast_id=$1
       ORDER BY br.status, br.sent_at DESC LIMIT 200`,
      [req.params.id]
    ),
  ]);
  if (!bc.rows[0]) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: { ...bc.rows[0], recipients: recipients.rows } });
});

// ─── DELETE /api/broadcasts/:id ───────────────────────────────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM broadcasts WHERE id=$1 AND status='draft'", [req.params.id]);
  res.json({ ok: true });
});

export default router;
