import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { razorpayService } from "../services/razorpayService.js";
import { whatsappService } from "../services/whatsappService.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/payments/stats ─────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE paid_at::date = CURRENT_DATE AND status='completed'), 0)           AS today,
      COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', now()) AND status='completed'), 0) AS this_month,
      COALESCE(SUM(amount) FILTER (WHERE status='completed'), 0)                                            AS all_time,
      COUNT(*) FILTER (WHERE status='pending')                                                              AS pending_count,
      COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)                                              AS pending_amount
    FROM payments
  `);
  res.json({ ok: true, data: rows.rows[0] });
});

// ─── GET /api/payments/revenue-trend ─────────────────────────
router.get("/revenue-trend", ...guard, async (req: TenantRequest, res) => {
  const { days = "30" } = req.query as { days?: string };
  const d = Math.min(90, Math.max(7, parseInt(days)));
  const rows = await req.db.query(
    `SELECT
       paid_at::date AS date,
       SUM(amount) AS revenue,
       COUNT(*) AS count
     FROM payments
     WHERE status = 'completed'
       AND paid_at >= now() - ($1 || ' days')::interval
     GROUP BY paid_at::date
     ORDER BY date`,
    [d]
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/payments ───────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { leadId, method, status, fromDate, toDate, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (leadId)   { conds.push(`p.lead_id = $${p++}`);    params.push(leadId); }
  if (method)   { conds.push(`p.method = $${p++}`);     params.push(method); }
  if (status)   { conds.push(`p.status = $${p++}`);     params.push(status); }
  if (fromDate) { conds.push(`p.paid_at >= $${p++}`);   params.push(fromDate); }
  if (toDate)   { conds.push(`p.paid_at <= $${p++}`);   params.push(toDate); }

  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT p.*, l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS recorded_by_name
       FROM payments p
       LEFT JOIN leads l ON l.id = p.lead_id
       LEFT JOIN users u ON u.id = p.recorded_by
       WHERE ${where}
       ORDER BY p.paid_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM payments p WHERE ${where}`, params),
  ]);

  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/payments ──────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, plan_id, amount, method = "cash", status = "completed",
          receipt_no, installment_no = 1, notes, paid_at } = req.body as Record<string, unknown>;

  if (!lead_id || !amount) {
    res.status(400).json({ ok: false, message: "lead_id and amount required" });
    return;
  }

  const row = await req.db.query(
    `INSERT INTO payments (lead_id, plan_id, amount, method, status, receipt_no, installment_no, notes, paid_at, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, now()),$10)
     RETURNING *`,
    [lead_id, plan_id ?? null, amount, method, status, receipt_no ?? null,
     installment_no, notes ?? null, paid_at ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/payments/:id ─────────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const { status, notes, receipt_no } = req.body as Record<string, unknown>;

  // Auto-generate receipt number when marking completed
  const autoReceipt = (status === "completed" && !receipt_no)
    ? `RCP-${Date.now()}`
    : (receipt_no ?? null);

  const row = await req.db.query(
    `UPDATE payments
     SET status     = COALESCE($2, status),
         notes      = COALESCE($3, notes),
         receipt_no = COALESCE($4, receipt_no),
         paid_at    = CASE WHEN $2 = 'completed' AND paid_at IS NULL THEN now() ELSE paid_at END
     WHERE id = $1 RETURNING *`,
    [req.params.id, status ?? null, notes ?? null, autoReceipt]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }

  const payment = row.rows[0];

  // Send WhatsApp receipt when payment is marked completed
  if (status === "completed") {
    try {
      const leadRow = await req.db.query(
        `SELECT l.full_name, l.phone,
                COALESCE(SUM(p2.amount) FILTER (WHERE p2.status='completed'), 0) AS total_paid,
                pp.total_fee - pp.discount AS net_fee
         FROM leads l
         LEFT JOIN payments p2 ON p2.lead_id = l.id
         LEFT JOIN payment_plans pp ON pp.lead_id = l.id
         WHERE l.id = $1
         GROUP BY l.full_name, l.phone, pp.total_fee, pp.discount`,
        [payment.lead_id]
      );
      if (leadRow.rows[0]) {
        const { full_name, phone, total_paid, net_fee } = leadRow.rows[0];
        const balance = net_fee ? Math.max(0, parseFloat(net_fee) - parseFloat(total_paid)) : null;
        const msg =
          `✅ Payment Received — Receipt #${payment.receipt_no}\n` +
          `Name: ${full_name}\n` +
          `Amount Paid: ₹${parseFloat(payment.amount).toLocaleString("en-IN")}\n` +
          `Date: ${new Date().toLocaleDateString("en-IN")}\n` +
          (balance !== null ? `Balance Due: ₹${balance.toLocaleString("en-IN")}\n` : "") +
          `Method: ${payment.method}\n` +
          `Thank you for your payment!`;
        await whatsappService.sendText(phone, msg);
      }
    } catch (_) { /* Non-fatal */ }
  }

  res.json({ ok: true, data: payment });
});

// ─── DELETE /api/payments/:id ────────────────────────────────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM payments WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── GET /api/payments/by-lead/:leadId ──────────────────────
router.get("/by-lead/:leadId", ...guard, async (req: TenantRequest, res) => {
  const { leadId } = req.params;
  const [plan, payments] = await Promise.all([
    req.db.query("SELECT * FROM payment_plans WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1", [leadId]),
    req.db.query(
      `SELECT p.*, u.full_name AS recorded_by_name
       FROM payments p LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.lead_id = $1 ORDER BY p.paid_at DESC`,
      [leadId]
    ),
  ]);
  const totalPaid = payments.rows.reduce((s: number, r: any) => s + parseFloat(r.amount ?? 0), 0);
  res.json({ ok: true, data: { plan: plan.rows[0] ?? null, payments: payments.rows, totalPaid } });
});

// ─── POST /api/payments/plans ────────────────────────────────
router.post("/plans", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, total_fee, discount = 0, installments = 1, notes,
          first_due_date, installment_amounts } = req.body as Record<string, unknown>;
  if (!lead_id || !total_fee) {
    res.status(400).json({ ok: false, message: "lead_id and total_fee required" });
    return;
  }

  let plan: any;
  const existing = await req.db.query("SELECT id FROM payment_plans WHERE lead_id=$1 LIMIT 1", [lead_id]);
  if (existing.rows.length) {
    const upd = await req.db.query(
      `UPDATE payment_plans SET total_fee=$2, discount=$3, installments=$4, notes=COALESCE($5,notes), updated_at=now()
       WHERE lead_id=$1 RETURNING *`,
      [lead_id, total_fee, discount, installments, notes ?? null]
    );
    plan = upd.rows[0];
  } else {
    const ins = await req.db.query(
      `INSERT INTO payment_plans (lead_id, total_fee, discount, installments, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [lead_id, total_fee, discount, installments, notes ?? null]
    );
    plan = ins.rows[0];
  }

  // Auto-generate installment schedule if first_due_date provided
  if (first_due_date && parseInt(String(installments)) > 0) {
    const n = parseInt(String(installments));
    const net = parseFloat(String(total_fee)) - parseFloat(String(discount));
    const customAmts = Array.isArray(installment_amounts) ? installment_amounts as number[] : [];
    const perInstallment = net / n;

    // Delete old schedule and rebuild
    await req.db.query("DELETE FROM payment_installments WHERE plan_id = $1", [plan.id]);

    const values: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    for (let i = 0; i < n; i++) {
      const dueDate = new Date(String(first_due_date));
      dueDate.setMonth(dueDate.getMonth() + i);
      const amt = customAmts[i] ?? perInstallment;
      values.push(`($${p++},$${p++},$${p++},$${p++},$${p++})`);
      params.push(plan.id, lead_id, i + 1, amt.toFixed(2), dueDate.toISOString().slice(0, 10));
    }
    if (values.length) {
      await req.db.query(
        `INSERT INTO payment_installments (plan_id, lead_id, installment_no, amount, due_date)
         VALUES ${values.join(",")}`,
        params
      );
    }
  }

  res.status(201).json({ ok: true, data: plan });
});

// ─── GET /api/payments/installments?leadId= ──────────────────
router.get("/installments", ...guard, async (req: TenantRequest, res) => {
  const { leadId } = req.query as { leadId?: string };
  if (!leadId) { res.status(400).json({ ok: false, message: "leadId required" }); return; }
  const rows = await req.db.query(
    `SELECT pi.*, p.receipt_no
     FROM payment_installments pi
     LEFT JOIN payments p ON p.id = pi.payment_id
     WHERE pi.lead_id = $1
     ORDER BY pi.installment_no`,
    [leadId]
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/payments/dues — upcoming & overdue dashboard ───
router.get("/dues", ...guard, async (req: TenantRequest, res) => {
  const { days = "7" } = req.query as { days?: string };
  const d = Math.min(30, Math.max(1, parseInt(days)));

  const [overdue, upcoming] = await Promise.all([
    req.db.query(
      `SELECT pi.*, l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS counsellor_name
       FROM payment_installments pi
       JOIN leads l ON l.id = pi.lead_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE pi.status = 'pending' AND pi.due_date < CURRENT_DATE
       ORDER BY pi.due_date ASC LIMIT 100`
    ),
    req.db.query(
      `SELECT pi.*, l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS counsellor_name
       FROM payment_installments pi
       JOIN leads l ON l.id = pi.lead_id
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE pi.status = 'pending'
         AND pi.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 || ' days')::INTERVAL
       ORDER BY pi.due_date ASC LIMIT 100`,
      [d]
    ),
  ]);

  const overdueAmt = overdue.rows.reduce((s: number, r: any) => s + parseFloat(r.amount), 0);
  const upcomingAmt = upcoming.rows.reduce((s: number, r: any) => s + parseFloat(r.amount), 0);

  res.json({
    ok: true,
    data: { overdue: overdue.rows, upcoming: upcoming.rows },
    meta: { overdueAmt, upcomingAmt, overdueCount: overdue.rowCount, upcomingCount: upcoming.rowCount },
  });
});

// ─── POST /api/payments/send-link — create Razorpay link + WhatsApp ──────────
router.post("/send-link", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, amount, description, expire_days = 3 } = req.body as Record<string, unknown>;

  if (!lead_id || !amount) {
    res.status(400).json({ ok: false, message: "lead_id and amount required" });
    return;
  }

  if (!razorpayService.isConfigured()) {
    res.status(400).json({ ok: false, message: "Razorpay not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to env" });
    return;
  }

  // Fetch lead details
  const leadRow = await req.db.query(
    "SELECT full_name, phone, email FROM leads WHERE id=$1",
    [lead_id]
  );
  if (!leadRow.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" }); return;
  }
  const lead = leadRow.rows[0];

  // Generate receipt id and create link
  const receiptId = `RCP-${Date.now()}`;
  const expireBy = new Date();
  expireBy.setDate(expireBy.getDate() + parseInt(String(expire_days)));

  const link = await razorpayService.createPaymentLink({
    amount: parseFloat(String(amount)),
    leadName: lead.full_name,
    leadPhone: lead.phone,
    leadEmail: lead.email ?? undefined,
    description: String(description || `Fee payment for ${lead.full_name}`),
    receiptId,
    expireBy,
  });

  // Store the pending payment record with receipt = link id
  const payRow = await req.db.query(
    `INSERT INTO payments (lead_id, amount, method, status, receipt_no, notes, recorded_by)
     VALUES ($1,$2,'online','pending',$3,$4,$5) RETURNING *`,
    [lead_id, amount, link.id, `Razorpay link sent: ${link.short_url}`, user.id]
  );

  // Send WhatsApp with link
  const msg =
    `Hi ${lead.full_name}, please complete your fee payment of ₹${parseFloat(String(amount)).toLocaleString("en-IN")} ` +
    `using this secure link: ${link.short_url}\nValid until ${expireBy.toLocaleDateString("en-IN")}.`;

  try {
    await whatsappService.sendText(lead.phone, msg);
  } catch (err) {
    // Non-fatal — link is still created
  }

  res.status(201).json({ ok: true, data: { payment: payRow.rows[0], link } });
});

// ─── PATCH /api/payments/installments/:id ────────────────────
router.patch("/installments/:id", ...guard, async (req: TenantRequest, res) => {
  const { status, paid_at, payment_id, notes } = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE payment_installments
     SET status     = COALESCE($2, status),
         paid_at    = COALESCE($3::timestamptz, CASE WHEN $2='paid' THEN now() ELSE paid_at END),
         payment_id = COALESCE($4::uuid, payment_id),
         notes      = COALESCE($5, notes),
         updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, status ?? null, paid_at ?? null, payment_id ?? null, notes ?? null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }

  const inst = row.rows[0];

  // Send WhatsApp receipt when installment is marked paid
  if (status === "paid") {
    try {
      const info = await req.db.query(
        `SELECT l.full_name, l.phone,
                pi2.installment_no AS inst_no,
                (SELECT COUNT(*) FROM payment_installments WHERE plan_id = pi2.plan_id) AS total_insts,
                (SELECT COUNT(*) FROM payment_installments WHERE plan_id = pi2.plan_id AND status='pending') AS remaining,
                pp.total_fee - pp.discount AS net_fee,
                COALESCE(SUM(pi3.amount) FILTER (WHERE pi3.status='paid'), 0) AS total_paid
         FROM payment_installments pi2
         JOIN leads l ON l.id = pi2.lead_id
         LEFT JOIN payment_plans pp ON pp.id = pi2.plan_id
         LEFT JOIN payment_installments pi3 ON pi3.plan_id = pi2.plan_id
         WHERE pi2.id = $1
         GROUP BY l.full_name, l.phone, pi2.installment_no, pi2.plan_id, pp.total_fee, pp.discount`,
        [req.params.id]
      );
      if (info.rows[0]) {
        const { full_name, phone, inst_no, total_insts, remaining, net_fee, total_paid } = info.rows[0];
        const balance = net_fee ? Math.max(0, parseFloat(net_fee) - parseFloat(total_paid)).toLocaleString("en-IN") : null;
        const autoReceiptNo = `INST-${Date.now()}`;
        const msg =
          `✅ Installment ${inst_no}/${total_insts} Received\n` +
          `Name: ${full_name}\n` +
          `Amount: ₹${parseFloat(inst.amount).toLocaleString("en-IN")}\n` +
          `Date: ${new Date().toLocaleDateString("en-IN")}\n` +
          `Receipt: ${autoReceiptNo}\n` +
          (balance !== null && parseInt(String(remaining)) > 0
            ? `Balance: ₹${balance} (${remaining} installment${parseInt(String(remaining)) > 1 ? "s" : ""} remaining)\n`
            : `All installments complete! 🎉\n`) +
          `Thank you for your payment!`;
        await whatsappService.sendText(phone, msg);
      }
    } catch (_) { /* Non-fatal */ }
  }

  res.json({ ok: true, data: inst });
});

export default router;
