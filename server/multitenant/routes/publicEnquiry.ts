import { Router } from "express";
import { getPool } from "../tenant/dbPool.js";
import { env } from "../env.js";
import logger from "../logger.js";

const router = Router();

router.post("/", async (req, res) => {
  const { name, phone, email, course, message } = req.body as Record<string, string>;

  if (!name?.trim() || !phone?.trim()) {
    res.status(400).json({ ok: false, error: "Name and phone are required" });
    return;
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    res.status(400).json({ ok: false, error: "Enter a valid phone number (7–15 digits)" });
    return;
  }

  try {
    const db = await getPool(env.DEMO_TENANT_ID);

    // Also create a lead so it appears in the CRM leads pipeline
    const notes = [
      course?.trim() ? `Interested in: ${course.trim()}` : null,
      message?.trim() ? `Message: ${message.trim()}` : null,
    ].filter(Boolean).join(" | ") || null;

    let leadId: string | null = null;
    try {
      const leadResult = await db.query(
        `INSERT INTO leads (full_name, phone, email, source, stage, objection_notes)
         VALUES ($1, $2, $3, 'website', 'new', $4)
         RETURNING id`,
        [name.trim(), phone.trim(), email?.trim() || null, notes]
      );
      leadId = leadResult.rows[0]?.id ?? null;
    } catch (err) {
      // Non-fatal — enquiry is still saved; lead creation failure just gets logged
      logger.warn({ err, phone: phone.trim() }, "Could not auto-create lead from website enquiry");
    }

    // Save to public_enquiries (source of truth for website submissions)
    await db.query(
      `INSERT INTO public_enquiries (name, phone, email, course, message, lead_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name.trim(), phone.trim(), email?.trim() || null, course?.trim() || null, message?.trim() || null, leadId]
    );

    logger.info({ name: name.trim(), phone: phone.trim(), course }, "Website enquiry saved");
    res.json({ ok: true, message: "Enquiry received! We will contact you within 24 hours." });
  } catch (err) {
    logger.error(err, "Failed to save website enquiry");
    res.status(500).json({ ok: false, error: "Failed to save enquiry. Please try again." });
  }
});

export default router;
