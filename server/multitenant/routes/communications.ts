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
  const { channel } = req.query as { channel?: string };
  const result = await req.db.query(
    `SELECT * FROM message_templates WHERE is_active = TRUE ${channel ? "AND channel = $1" : ""} ORDER BY name`,
    channel ? [channel] : []
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
  const { name, subject, body, isActive, waTemplateName } = req.body as {
    name?: string; subject?: string; body?: string; isActive?: boolean; waTemplateName?: string;
  };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)          { sets.push(`name = $${p++}`); params.push(name); }
  if (subject !== undefined)       { sets.push(`subject = $${p++}`); params.push(subject); }
  if (body !== undefined)          { sets.push(`body = $${p++}`); params.push(body); }
  if (isActive !== undefined)      { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (waTemplateName !== undefined) { sets.push(`wa_template_name = $${p++}`); params.push(waTemplateName); }

  if (!sets.length) { res.status(400).json({ ok: false, message: "Nothing to update" }); return; }

  await req.db.query(`UPDATE message_templates SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

export default router;
