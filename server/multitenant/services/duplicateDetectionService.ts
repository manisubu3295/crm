import type { Pool } from "pg";
import type { DuplicateCheckResult } from "../../../shared/types.js";

export const duplicateDetectionService = {
  async check(
    db: Pool,
    data: { phone: string; email?: string; fullName: string }
  ): Promise<DuplicateCheckResult> {
    // 1. Exact phone match
    const byPhone = await db.query(
      "SELECT id, lead_no FROM leads WHERE phone = $1 AND is_duplicate = FALSE LIMIT 1",
      [data.phone]
    );
    if (byPhone.rows[0]) {
      return {
        isDuplicate: true,
        matchedLeadId: byPhone.rows[0].id,
        matchedLeadNo: byPhone.rows[0].lead_no,
        confidence: "exact_phone",
      };
    }

    // 2. Exact email match (if provided)
    if (data.email) {
      const byEmail = await db.query(
        "SELECT id, lead_no FROM leads WHERE email = $1 AND is_duplicate = FALSE LIMIT 1",
        [data.email]
      );
      if (byEmail.rows[0]) {
        return {
          isDuplicate: true,
          matchedLeadId: byEmail.rows[0].id,
          matchedLeadNo: byEmail.rows[0].lead_no,
          confidence: "exact_email",
        };
      }
    }

    // 3. Fuzzy name match using pg_trgm (similarity > 0.8)
    const byName = await db.query(
      `SELECT id, lead_no FROM leads
       WHERE similarity(full_name, $1) > 0.8
         AND is_duplicate = FALSE
       ORDER BY similarity(full_name, $1) DESC
       LIMIT 1`,
      [data.fullName]
    );
    if (byName.rows[0]) {
      return {
        isDuplicate: true,
        matchedLeadId: byName.rows[0].id,
        matchedLeadNo: byName.rows[0].lead_no,
        confidence: "fuzzy_name",
      };
    }

    return { isDuplicate: false, confidence: "none" };
  },

  async merge(db: Pool, duplicateId: string, masterId: string, mergedBy: string) {
    // Transfer all tasks, comms, and stage history from duplicate to master
    await db.query("UPDATE tasks SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE communication_logs SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE lead_stage_history SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE opportunities SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);

    // Mark duplicate as merged
    await db.query(
      "UPDATE leads SET is_duplicate = TRUE, duplicate_of = $1, updated_at = now() WHERE id = $2",
      [masterId, duplicateId]
    );

    return { merged: duplicateId, into: masterId };
  },
};
