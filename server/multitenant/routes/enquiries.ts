import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/enquiries
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { status, limit = "100", offset = "0" } = req.query as Record<string, string>;
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(Number(limit), Number(offset));

  const result = await req.db.query(
    `SELECT id, name, phone, email, course, message, status, lead_id, created_at
     FROM public_enquiries
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ ok: true, data: result.rows });
});

// PATCH /api/enquiries/:id/status
router.patch("/:id/status", ...guard, async (req: TenantRequest, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };

  const valid = ["new", "contacted", "converted", "closed"];
  if (!valid.includes(status)) {
    res.status(400).json({ ok: false, message: "Invalid status" });
    return;
  }

  await req.db.query(
    "UPDATE public_enquiries SET status = $1 WHERE id = $2",
    [status, id]
  );

  res.json({ ok: true });
});

export default router;
