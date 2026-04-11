import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { communicationService } from "../services/communicationService.js";
import { sendMessageSchema } from "../../../shared/types.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/comms/:leadId  — full communication timeline
router.get("/:leadId", ...guard, async (req: TenantRequest, res) => {
  const { leadId } = req.params;
  const result = await req.db.query(
    `SELECT cl.*, mt.name AS template_name, u.full_name AS sent_by_name
     FROM communication_logs cl
     LEFT JOIN message_templates mt ON cl.template_id = mt.id
     LEFT JOIN users u ON cl.sent_by = u.id
     WHERE cl.lead_id = $1
     ORDER BY cl.created_at DESC
     LIMIT 100`,
    [leadId]
  );
  res.json({ ok: true, data: result.rows });
});

// POST /api/comms/send  — manual send (any channel)
router.post("/send", ...guard, async (req: TenantRequest, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }
  const result = await communicationService.send(req.db, req.tenantId, parsed.data, req.user!.sub);
  res.status(201).json({ ok: true, data: result });
});

// GET /api/comms/templates  — list templates
router.get("/templates", ...guard, async (req: TenantRequest, res) => {
  const { channel, approvalStatus, all } = req.query as { channel?: string; approvalStatus?: string; all?: string };
  const conds: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  if (all !== "true") { conds.push("is_active = TRUE"); }
  if (channel)        { conds.push(`channel = $${p++}`); params.push(channel); }
  if (approvalStatus) { conds.push(`approval_status = $${p++}`); params.push(approvalStatus); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const result = await req.db.query(
    `SELECT * FROM message_templates ${where} ORDER BY name`,
    params
  );
  res.json({ ok: true, data: result.rows });
});

// POST /api/comms/templates
router.post("/templates", ...guard, async (req: TenantRequest, res) => {
  const { name, channel, triggerEvent, subject, body, variables, waTemplateName } = req.body as {
    name: string; channel: string; triggerEvent?: string; subject?: string;
    body: string; variables?: unknown; waTemplateName?: string;
  };

  if (!name || !channel || !body) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: "name, channel, body required" });
    return;
  }

  const result = await req.db.query(
    `INSERT INTO message_templates (name, channel, trigger_event, subject, body, variables, wa_template_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, channel, triggerEvent ?? null, subject ?? null, body, variables ? JSON.stringify(variables) : null, waTemplateName ?? null]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

// PATCH /api/comms/templates/:id
router.patch("/templates/:id", ...guard, async (req: TenantRequest, res) => {
  const {
    name, subject, body, isActive, waTemplateName,
    approvalStatus, metaTemplateId, metaTemplateName, rejectionReason,
  } = req.body as {
    name?: string; subject?: string; body?: string; isActive?: boolean; waTemplateName?: string;
    approvalStatus?: string; metaTemplateId?: string; metaTemplateName?: string; rejectionReason?: string;
  };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)             { sets.push(`name = $${p++}`); params.push(name); }
  if (subject !== undefined)          { sets.push(`subject = $${p++}`); params.push(subject); }
  if (body !== undefined)             { sets.push(`body = $${p++}`); params.push(body); }
  if (isActive !== undefined)         { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (waTemplateName !== undefined)   { sets.push(`wa_template_name = $${p++}`); params.push(waTemplateName); }
  if (approvalStatus !== undefined)   {
    sets.push(`approval_status = $${p++}`); params.push(approvalStatus);
    if (approvalStatus === "pending")  { sets.push(`submitted_at = now()`); }
    if (approvalStatus === "approved") { sets.push(`approved_at = now()`); }
  }
  if (metaTemplateId !== undefined)   { sets.push(`meta_template_id = $${p++}`); params.push(metaTemplateId); }
  if (metaTemplateName !== undefined) { sets.push(`meta_template_name = $${p++}`); params.push(metaTemplateName); }
  if (rejectionReason !== undefined)  { sets.push(`rejection_reason = $${p++}`); params.push(rejectionReason); }

  if (!sets.length) { res.status(400).json({ ok: false, message: "Nothing to update" }); return; }

  const row = await req.db.query(
    `UPDATE message_templates SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// POST /api/comms/templates/:id/submit
// Mark template as submitted to Meta for approval
router.post("/templates/:id/submit", ...guard, async (req: TenantRequest, res) => {
  const { metaTemplateName } = req.body as { metaTemplateName?: string };
  const row = await req.db.query(
    `UPDATE message_templates
       SET approval_status = 'pending', submitted_at = now(),
           meta_template_name = COALESCE($2, meta_template_name)
     WHERE id = $1 AND channel = 'whatsapp'
     RETURNING *`,
    [req.params.id, metaTemplateName ?? null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Template not found or not a WhatsApp template" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// POST /api/comms/templates/sync-approval
// Called by Meta webhook or manually — updates approval_status from Meta
router.post("/templates/sync-approval", ...guard, async (req: TenantRequest, res) => {
  const updates = req.body as Array<{
    metaTemplateId: string;
    metaTemplateName: string;
    status: string;
    rejectionReason?: string;
  }>;

  if (!Array.isArray(updates)) {
    res.status(400).json({ ok: false, message: "Expected array of template updates" }); return;
  }

  const results = [];
  for (const u of updates) {
    const dbStatus = u.status === "APPROVED" ? "approved"
                   : u.status === "REJECTED" ? "rejected"
                   : u.status === "PENDING"  ? "pending"
                   : u.status === "PAUSED"   ? "paused"
                   : "draft";
    const row = await req.db.query(
      `UPDATE message_templates
         SET approval_status = $1,
             meta_template_id = $2,
             rejection_reason = $3,
             approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END
       WHERE meta_template_name = $4 OR wa_template_name = $4
       RETURNING id, name, approval_status`,
      [dbStatus, u.metaTemplateId, u.rejectionReason ?? null, u.metaTemplateName]
    );
    if (row.rows[0]) results.push(row.rows[0]);
  }

  res.json({ ok: true, updated: results.length, data: results });
});

export default router;
