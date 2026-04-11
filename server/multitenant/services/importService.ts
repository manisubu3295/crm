import * as XLSX from "xlsx";
import type { Pool } from "pg";
import { leadService } from "./leadService.js";
import logger from "../logger.js";

type ImportResult = {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  errorRows: Array<{ row: number; reason: string }>;
};

// Expected column headers (case-insensitive)
const COL_MAP: Record<string, string> = {
  "name": "fullName",
  "full name": "fullName",
  "phone": "phone",
  "mobile": "phone",
  "email": "email",
  "city": "city",
  "qualification": "qualification",
  "course": "courseName",
  "source": "source",
  "campaign": "campaignName",
};

export const importService = {
  async importLeadsFromExcel(
    db: Pool,
    tenantId: string,
    buffer: Buffer,
    importedBy: string
  ): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    if (!sheet) throw new Error("No worksheet found in file");

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    });

    const result: ImportResult = { total: rows.length, imported: 0, duplicates: 0, errors: 0, errorRows: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const rowNum = i + 2; // 1-indexed + header row

      try {
        // Normalize column names
        const normalized: Record<string, string> = {};
        for (const [key, val] of Object.entries(row)) {
          const mappedKey = COL_MAP[key.toLowerCase().trim()];
          if (mappedKey) normalized[mappedKey] = String(val).trim();
        }

        if (!normalized["fullName"] || !normalized["phone"]) {
          result.errors++;
          result.errorRows.push({ row: rowNum, reason: "Missing name or phone" });
          continue;
        }

        // Resolve course
        let courseId: string | undefined;
        if (normalized["courseName"]) {
          const c = await db.query("SELECT id FROM courses WHERE name ILIKE $1 LIMIT 1", [normalized["courseName"]]);
          courseId = c.rows[0]?.id;
        }

        // Resolve campaign
        let campaignId: string | undefined;
        if (normalized["campaignName"]) {
          const c = await db.query("SELECT id FROM campaigns WHERE name ILIKE $1 LIMIT 1", [normalized["campaignName"]]);
          campaignId = c.rows[0]?.id;
        }

        const source = normalizeSource(normalized["source"]);

        const { lead, duplicate } = await leadService.create(
          db,
          tenantId,
          {
            fullName: normalized["fullName"]!,
            phone: normalized["phone"]!,
            email: normalized["email"] || undefined,
            city: normalized["city"] || undefined,
            qualification: normalized["qualification"] || undefined,
            courseId,
            campaignId,
            source,
          },
          importedBy
        );

        if (duplicate.isDuplicate) {
          result.duplicates++;
        } else {
          result.imported++;
        }

      } catch (err) {
        result.errors++;
        result.errorRows.push({ row: rowNum, reason: (err as Error).message });
        logger.warn({ row: rowNum, err }, "Import row failed");
      }
    }

    logger.info({ tenantId, ...result }, "Lead import complete");
    return result;
  },
};

function normalizeSource(raw?: string): "meta_ads" | "website" | "manual" | "excel_import" | "walk_in" | "phone" | "referral" {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("meta") || s.includes("facebook")) return "meta_ads";
  if (s.includes("website") || s.includes("web")) return "website";
  if (s.includes("walk") || s.includes("walkin")) return "walk_in";
  if (s.includes("phone") || s.includes("call")) return "phone";
  if (s.includes("referral") || s.includes("refer")) return "referral";
  return "excel_import";
}
