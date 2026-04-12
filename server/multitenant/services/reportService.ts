import ExcelJS from "exceljs";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import os from "os";
import type { Pool } from "pg";
import { env } from "../env.js";
import logger from "../logger.js";

// Simple semaphore for PDF concurrency control
let activePdfs = 0;

async function withPdfSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (activePdfs >= env.REPORT_PDF_CONCURRENCY) {
    await new Promise((r) => setTimeout(r, 200));
  }
  activePdfs++;
  try {
    return await fn();
  } finally {
    activePdfs--;
  }
}

export const reportService = {
  async exportExcel(
    db: Pool,
    type: string,
    opts: {
      fromDate?: string;
      toDate?: string;
      counsellorId?: string;
      campaignId?: string;
      stage?: string;
      assignedTo?: string;
    }
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Aadhirai CRM";
    workbook.created = new Date();

    if (type === "all_leads" || type === "funnel") {
      const sheet = workbook.addWorksheet("Leads");
      sheet.columns = [
        { header: "Lead No", key: "lead_no", width: 16 },
        { header: "Name", key: "full_name", width: 22 },
        { header: "Phone", key: "phone", width: 16 },
        { header: "Email", key: "email", width: 28 },
        { header: "City", key: "city", width: 16 },
        { header: "Course", key: "course_name", width: 20 },
        { header: "Source", key: "source", width: 14 },
        { header: "Stage", key: "stage", width: 14 },
        { header: "Score", key: "lead_score", width: 8 },
        { header: "Assigned To", key: "counsellor", width: 20 },
        { header: "Created", key: "created_at", width: 20 },
      ];

      const params: string[] = [];
      const clauses: string[] = [];
      if (opts.fromDate) { params.push(opts.fromDate); clauses.push(`l.created_at >= $${params.length}`); }
      if (opts.toDate)   { params.push(opts.toDate);   clauses.push(`l.created_at <= $${params.length}`); }
      if (opts.stage)    { params.push(opts.stage);    clauses.push(`l.stage = $${params.length}`); }
      if (opts.assignedTo) { params.push(opts.assignedTo); clauses.push(`l.assigned_to = $${params.length}`); }

      const rows = await db.query(
        `SELECT l.lead_no, l.full_name, l.phone, l.email, l.city, c.name AS course_name,
                l.source, l.stage, l.lead_score, u.full_name AS counsellor, l.created_at
         FROM leads l
         LEFT JOIN courses c ON l.course_id = c.id
         LEFT JOIN users u ON l.assigned_to = u.id
         ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""}
         ORDER BY l.created_at DESC`,
        params
      );

      sheet.addRows(rows.rows);
      styleHeader(sheet);
    }

    if (type === "counsellor") {
      const sheet = workbook.addWorksheet("Counsellor Performance");
      sheet.columns = [
        { header: "Counsellor", key: "full_name", width: 24 },
        { header: "Total Leads", key: "total_leads", width: 14 },
        { header: "Admissions", key: "admissions", width: 14 },
        { header: "Conversion %", key: "conversion_rate", width: 14 },
        { header: "Calls Made", key: "calls_made", width: 14 },
        { header: "Overdue Tasks", key: "overdue_tasks", width: 16 },
        { header: "Avg Score", key: "avg_lead_score", width: 12 },
      ];
      const rows = await db.query(
        `SELECT u.full_name,
           COUNT(DISTINCT l.id) AS total_leads,
           COUNT(DISTINCT l.id) FILTER (WHERE l.stage='admitted') AS admissions,
           ROUND(100.0*COUNT(DISTINCT l.id) FILTER(WHERE l.stage='admitted')/NULLIF(COUNT(DISTINCT l.id),0),1) AS conversion_rate,
           COUNT(DISTINCT t.id) FILTER(WHERE t.task_type='call' AND t.status='done') AS calls_made,
           COUNT(DISTINCT t.id) FILTER(WHERE t.status='overdue') AS overdue_tasks,
           ROUND(AVG(l.lead_score),1) AS avg_lead_score
         FROM users u
         LEFT JOIN leads l ON l.assigned_to=u.id
         LEFT JOIN tasks t ON t.lead_id=l.id
         WHERE u.role='counsellor' AND u.is_active=TRUE
         GROUP BY u.id,u.full_name ORDER BY admissions DESC`
      );
      sheet.addRows(rows.rows);
      styleHeader(sheet);
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  },

  async exportPdf(db: Pool, tenantId: string, type: string, opts: { fromDate?: string; toDate?: string }): Promise<Buffer> {
    return withPdfSlot(async () => {
      // Fetch template from DB or fallback to default
      const tmplResult = await db.query(
        "SELECT html_template, css FROM report_templates WHERE report_key = $1 AND is_active = TRUE LIMIT 1",
        [type]
      );

      let htmlTemplate = tmplResult.rows[0]?.html_template ?? getDefaultTemplate(type);
      const css = tmplResult.rows[0]?.css ?? defaultCss;

      // Fetch data for the template
      const data = await fetchReportData(db, type, opts);

      // Render Handlebars template
      const compiled = Handlebars.compile(htmlTemplate);
      const html = `<html><head><style>${css}</style></head><body>${compiled(data)}</body></html>`;

      // Write to temp file and render via Puppeteer
      const tmpFile = path.join(env.REPORT_TMP_DIR, `report-${tenantId}-${Date.now()}.html`);
      fs.mkdirSync(env.REPORT_TMP_DIR, { recursive: true });
      fs.writeFileSync(tmpFile, html);

      let browser;
      try {
        browser = await puppeteer.launch({
          executablePath: env.PUPPETEER_EXECUTABLE_PATH,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
          headless: true,
        });
        const page = await browser.newPage();
        await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } });
        return Buffer.from(pdf);
      } finally {
        await browser?.close();
        fs.unlinkSync(tmpFile);
      }
    });
  },
};

async function fetchReportData(db: Pool, type: string, opts: { fromDate?: string; toDate?: string }) {
  const inst = await db.query("SELECT value FROM app_settings WHERE key='institution_name'");
  const institutionName = inst.rows[0]?.value ?? "Institution";
  const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  if (type === "funnel") {
    const stages = await db.query(
      `SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage ORDER BY CASE stage WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3 WHEN 'demo' THEN 4 WHEN 'interested' THEN 5 WHEN 'payment' THEN 6 WHEN 'admitted' THEN 7 ELSE 8 END`
    );
    return { institutionName, generatedAt, stages: stages.rows, period: opts };
  }

  return { institutionName, generatedAt, period: opts };
}

function getDefaultTemplate(type: string) {
  return `
    <h1>{{institutionName}}</h1>
    <h2>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h2>
    <p>Generated: {{generatedAt}}</p>
    {{#if stages}}
    <table><thead><tr><th>Stage</th><th>Count</th></tr></thead><tbody>
    {{#each stages}}<tr><td>{{stage}}</td><td>{{count}}</td></tr>{{/each}}
    </tbody></table>
    {{/if}}
  `;
}

const defaultCss = `
  body { font-family: Arial, sans-serif; color: #333; }
  h1 { color: #1e40af; } h2 { color: #374151; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
`;

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  row.alignment = { horizontal: "center" };
}
