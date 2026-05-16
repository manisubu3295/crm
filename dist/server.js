var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/multitenant/env.ts
import { z } from "zod";
import { config } from "dotenv";
var envSchema, parsed, env;
var init_env = __esm({
  "server/multitenant/env.ts"() {
    "use strict";
    config();
    envSchema = z.object({
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      PORT: z.coerce.number().default(3e3),
      // Multi-tenancy
      TENANT_REGISTRY_PATH: z.string(),
      TENANT_ADMIN_KEY: z.string().optional(),
      DEMO_TENANT_ID: z.string().default("demo"),
      DEMO_TENANT_FALLBACK: z.coerce.boolean().default(false),
      TENANT_DB_POOL_MAX: z.coerce.number().default(10),
      TENANT_DB_IDLE_MS: z.coerce.number().default(3e4),
      TENANT_DB_CONN_MS: z.coerce.number().default(5e3),
      // Security
      JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
      CORS_ORIGINS: z.string().default("http://localhost:5173"),
      RATE_LIMIT_WINDOW_MS: z.coerce.number().default(9e5),
      RATE_LIMIT_MAX: z.coerce.number().default(200),
      // Redis
      REDIS_URL: z.string().default("redis://localhost:6379"),
      // Meta / WhatsApp
      META_APP_SECRET: z.string().optional(),
      META_VERIFY_TOKEN: z.string().optional(),
      META_ACCESS_TOKEN: z.string().optional(),
      META_PHONE_NUMBER_ID: z.string().optional(),
      META_API_VERSION: z.string().default("v25.0"),
      // SendGrid
      SENDGRID_API_KEY: z.string().optional(),
      EMAIL_FROM: z.string().default("noreply@crm.local"),
      EMAIL_FROM_NAME: z.string().default("CRM"),
      // Msg91
      MSG91_AUTH_KEY: z.string().optional(),
      MSG91_SENDER_ID: z.string().default("TRACRM"),
      MSG91_ROUTE: z.string().default("4"),
      MSG91_OTP_TEMPLATE_ID: z.string().optional(),
      // Exotel
      EXOTEL_API_KEY: z.string().optional(),
      EXOTEL_API_TOKEN: z.string().optional(),
      EXOTEL_SID: z.string().optional(),
      EXOTEL_CALLER_ID: z.string().optional(),
      EXOTEL_SUBDOMAIN: z.string().default("api.exotel.com"),
      // Reports
      PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
      REPORT_TMP_DIR: z.string().default("/var/tmp/crm-reports"),
      REPORT_PDF_CONCURRENCY: z.coerce.number().default(2),
      TEMPLATE_CACHE_TTL_MS: z.coerce.number().default(6e5),
      // Web Push (VAPID)
      VAPID_PUBLIC_KEY: z.string().optional(),
      VAPID_PRIVATE_KEY: z.string().optional(),
      VAPID_SUBJECT: z.string().default("mailto:admin@crm.local"),
      // Razorpay
      RAZORPAY_KEY_ID: z.string().optional(),
      RAZORPAY_KEY_SECRET: z.string().optional(),
      RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
      // Migrations
      MIGRATION_TRANSACTION_ENABLED: z.coerce.boolean().default(true),
      // Logging
      LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
    });
    parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error("Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
      process.exit(1);
    }
    env = parsed.data;
  }
});

// server/multitenant/logger.ts
import pino from "pino";
var logger, logger_default;
var init_logger = __esm({
  "server/multitenant/logger.ts"() {
    "use strict";
    init_env();
    logger = pino({
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true } } : void 0
    });
    logger_default = logger;
  }
});

// server/multitenant/tenant/registry.ts
import fs from "fs";
function loadRegistry() {
  try {
    const raw = fs.readFileSync(env.TENANT_REGISTRY_PATH, "utf-8");
    _registry = JSON.parse(raw);
    logger_default.info({ count: Object.keys(_registry.tenants).length }, "Tenant registry loaded");
  } catch (err) {
    logger_default.warn({ err, path: env.TENANT_REGISTRY_PATH }, "Could not load tenant registry \u2014 starting empty");
  }
}
function getRegistry() {
  return _registry;
}
function registerTenant(id, config2) {
  _registry.tenants[id] = config2;
  fs.writeFileSync(env.TENANT_REGISTRY_PATH, JSON.stringify(_registry, null, 2));
  logger_default.info({ tenantId: id }, "Tenant registered and persisted");
}
var _registry;
var init_registry = __esm({
  "server/multitenant/tenant/registry.ts"() {
    "use strict";
    init_env();
    init_logger();
    _registry = { tenants: {} };
  }
});

// server/multitenant/tenant/dbPool.ts
import pg from "pg";
async function getPool(tenantId) {
  if (_pools.has(tenantId)) {
    return _pools.get(tenantId);
  }
  const registry = getRegistry();
  const config2 = registry.tenants[tenantId];
  if (!config2) throw new Error(`Tenant not found: ${tenantId}`);
  const pool = new Pool({
    connectionString: config2.dbUrl,
    max: env.TENANT_DB_POOL_MAX,
    idleTimeoutMillis: env.TENANT_DB_IDLE_MS,
    connectionTimeoutMillis: env.TENANT_DB_CONN_MS
  });
  const client = await pool.connect();
  client.release();
  _pools.set(tenantId, pool);
  logger_default.info({ tenantId }, "DB pool created");
  return pool;
}
async function closeAllPools() {
  for (const [id, pool] of _pools) {
    await pool.end();
    logger_default.info({ tenantId: id }, "DB pool closed");
  }
  _pools.clear();
}
var Pool, _pools;
var init_dbPool = __esm({
  "server/multitenant/tenant/dbPool.ts"() {
    "use strict";
    init_registry();
    init_env();
    init_logger();
    ({ Pool } = pg);
    _pools = /* @__PURE__ */ new Map();
  }
});

// server/multitenant/lib/ioRegistry.ts
function setIo(io) {
  _io = io;
}
function getIo() {
  return _io;
}
var _io;
var init_ioRegistry = __esm({
  "server/multitenant/lib/ioRegistry.ts"() {
    "use strict";
    _io = null;
  }
});

// server/multitenant/services/leadScoringService.ts
var leadScoringService_exports = {};
__export(leadScoringService_exports, {
  leadScoringService: () => leadScoringService
});
var leadScoringService;
var init_leadScoringService = __esm({
  "server/multitenant/services/leadScoringService.ts"() {
    "use strict";
    leadScoringService = {
      calculateInitial(data) {
        let score = 0;
        const sourceScores = {
          walk_in: 25,
          referral: 25,
          meta_ads: 20,
          phone: 20,
          website: 15,
          excel_import: 10,
          manual: 5
        };
        score += sourceScores[data.source ?? "manual"] ?? 5;
        if (data.email) score += 4;
        if (data.city) score += 3;
        if (data.qualification) score += 3;
        return Math.min(score, 100);
      },
      async recalculate(db, leadId) {
        const [lead, comms, history] = await Promise.all([
          db.query("SELECT * FROM leads WHERE id = $1", [leadId]),
          db.query(
            "SELECT channel, status, created_at FROM communication_logs WHERE lead_id = $1 ORDER BY created_at ASC",
            [leadId]
          ),
          db.query(
            "SELECT to_stage, changed_at FROM lead_stage_history WHERE lead_id = $1 ORDER BY changed_at ASC",
            [leadId]
          )
        ]);
        if (!lead.rows[0]) return 0;
        const l = lead.rows[0];
        let score = leadScoringService.calculateInitial(l);
        const firstContact = comms.rows.find((c) => c.direction !== "inbound");
        if (firstContact) {
          const diffH = (new Date(firstContact.created_at).getTime() - new Date(l.created_at).getTime()) / 36e5;
          if (diffH <= 1) score += 20;
          else if (diffH <= 4) score += 15;
          else if (diffH <= 24) score += 10;
        }
        const hasReplied = comms.rows.some((c) => c.direction === "inbound");
        if (hasReplied) score += 15;
        const hasEmailOpen = comms.rows.some((c) => c.channel === "email" && c.status === "read");
        if (hasEmailOpen) score += 5;
        const attendedDemo = history.rows.some((h) => h.to_stage === "demo");
        if (attendedDemo) score += 25;
        const stageOrder = ["new", "contacted", "qualified", "demo", "interested", "payment", "admitted"];
        const maxStageIdx = Math.max(...history.rows.map((h) => stageOrder.indexOf(h.to_stage)));
        score += Math.min(maxStageIdx * 5, 20);
        if (l.last_contacted_at) {
          const diffDays = (Date.now() - new Date(l.last_contacted_at).getTime()) / 864e5;
          if (diffDays <= 3) score += 10;
          else if (diffDays <= 7) score += 5;
        }
        score = Math.min(score, 100);
        await db.query("UPDATE leads SET lead_score = $1, updated_at = now() WHERE id = $2", [
          score,
          leadId
        ]);
        return score;
      },
      getLabel(score) {
        if (score <= 30) return "cold";
        if (score <= 60) return "warm";
        if (score <= 80) return "hot";
        return "very_hot";
      }
    };
  }
});

// server/multitenant/queues/redisClient.ts
import { Redis } from "ioredis";
import { createConnection } from "net";
async function probeRedis() {
  const url = new URL(env.REDIS_URL.replace("redis://", "http://"));
  const host = url.hostname;
  const port = parseInt(url.port || "6379", 10);
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2e3);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
function getRedisConnection() {
  if (!_connection) {
    _connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null
    });
  }
  return _connection;
}
var _connection, nullQueue;
var init_redisClient = __esm({
  "server/multitenant/queues/redisClient.ts"() {
    "use strict";
    init_env();
    _connection = null;
    nullQueue = {
      add: async () => null,
      addBulk: async () => [],
      upsertJobScheduler: async () => null
    };
  }
});

// server/multitenant/queues/automationQueue.ts
import { Queue } from "bullmq";
function setAutomationRedisAvailable(v) {
  _redisAvailable = v;
}
function getAutomationQueue() {
  if (!_queue) {
    _queue = new Queue("crm-automation", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5e3 },
        removeOnComplete: { count: 1e3 },
        removeOnFail: { count: 500 }
      }
    });
  }
  return _queue;
}
var _redisAvailable, _queue, automationQueue;
var init_automationQueue = __esm({
  "server/multitenant/queues/automationQueue.ts"() {
    "use strict";
    init_redisClient();
    _redisAvailable = false;
    _queue = null;
    automationQueue = {
      add: async (...args) => {
        if (!_redisAvailable) return nullQueue.add();
        return getAutomationQueue().add(...args);
      }
    };
  }
});

// server/multitenant/lib/socketEmitter.ts
function emitToTenant(tenantId, event, payload) {
  const io = getIo();
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, payload);
}
var init_socketEmitter = __esm({
  "server/multitenant/lib/socketEmitter.ts"() {
    "use strict";
    init_ioRegistry();
  }
});

// server/multitenant/services/notificationService.ts
var notificationService_exports = {};
__export(notificationService_exports, {
  notificationService: () => notificationService
});
async function getWebPush() {
  if (webpush) return webpush;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  try {
    webpush = await import("web-push");
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    return webpush;
  } catch {
    return null;
  }
}
async function sendPushToUser(db, userId, title, body, leadId) {
  const wp = await getWebPush();
  if (!wp) return;
  const subs = await db.query(
    "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );
  const payload = JSON.stringify({
    title,
    body: body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: leadId ? `/leads/${leadId}` : "/" }
  });
  for (const sub of subs.rows) {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.query("DELETE FROM push_subscriptions WHERE id = $1", [sub.id]);
      } else {
        logger_default.warn({ err, endpoint: sub.endpoint }, "Push send failed");
      }
    }
  }
}
var webpush, notificationService;
var init_notificationService = __esm({
  "server/multitenant/services/notificationService.ts"() {
    "use strict";
    init_env();
    init_ioRegistry();
    init_logger();
    webpush = null;
    notificationService = {
      async create(db, ioOverride, tenantId, payload) {
        const result = await db.query(
          `INSERT INTO notifications (user_id, type, title, body, lead_id, task_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [
            payload.userId,
            payload.type,
            payload.title,
            payload.body ?? null,
            payload.leadId ?? null,
            payload.taskId ?? null
          ]
        );
        const io = ioOverride ?? getIo();
        if (io) {
          io.to(`user:${payload.userId}`).emit("notification", {
            id: result.rows[0].id,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            leadId: payload.leadId,
            taskId: payload.taskId
          });
        }
        sendPushToUser(db, payload.userId, payload.title, payload.body, payload.leadId).catch(() => {
        });
        return result.rows[0].id;
      },
      async notify(db, tenantId, userId, type, title, opts) {
        return notificationService.create(db, null, tenantId, {
          userId,
          type,
          title,
          ...opts
        });
      },
      async notifyUser(db, io, tenantId, userId, type, title, opts) {
        return notificationService.create(db, io, tenantId, {
          userId,
          type,
          title,
          ...opts
        });
      },
      async notifyRole(db, io, tenantId, role, type, title, opts) {
        const users2 = await db.query(
          "SELECT id FROM users WHERE role = $1 AND is_active = TRUE",
          [role]
        );
        for (const u of users2.rows) {
          await notificationService.create(db, io, tenantId, {
            userId: u.id,
            type,
            title,
            ...opts
          });
        }
      }
    };
  }
});

// server/multitenant/services/whatsappService.ts
import axios from "axios";
var BASE, whatsappService;
var init_whatsappService = __esm({
  "server/multitenant/services/whatsappService.ts"() {
    "use strict";
    init_env();
    init_logger();
    BASE = `https://graph.facebook.com/${env.META_API_VERSION}`;
    whatsappService = {
      async sendText(phone, body) {
        const res = await axios.post(
          `${BASE}/${env.META_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: phone.replace(/\D/g, ""),
            type: "text",
            text: { body }
          },
          {
            headers: {
              Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
        const wamid = res.data?.messages?.[0]?.id;
        logger_default.debug({ phone, wamid }, "WhatsApp message sent");
        return wamid;
      },
      async sendTemplate(phone, templateName, components) {
        const res = await axios.post(
          `${BASE}/${env.META_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: phone.replace(/\D/g, ""),
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
              components
            }
          },
          {
            headers: {
              Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
        return res.data?.messages?.[0]?.id;
      },
      async verifyWebhookSignature(body, signature) {
        const crypto3 = await import("crypto");
        const expected = `sha256=${crypto3.createHmac("sha256", env.META_APP_SECRET ?? "").update(body).digest("hex")}`;
        return crypto3.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      }
    };
  }
});

// server/multitenant/services/reportService.ts
var reportService_exports = {};
__export(reportService_exports, {
  reportService: () => reportService
});
import ExcelJS from "exceljs";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import fs3 from "fs";
import path2 from "path";
async function withPdfSlot(fn) {
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
async function fetchReportData(db, type, opts) {
  const inst = await db.query("SELECT value FROM app_settings WHERE key='institution_name'");
  const institutionName = inst.rows[0]?.value ?? "Institution";
  const generatedAt = (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  if (type === "funnel") {
    const stages = await db.query(
      `SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage ORDER BY CASE stage WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3 WHEN 'demo' THEN 4 WHEN 'interested' THEN 5 WHEN 'payment' THEN 6 WHEN 'admitted' THEN 7 ELSE 8 END`
    );
    return { institutionName, generatedAt, stages: stages.rows, period: opts };
  }
  return { institutionName, generatedAt, period: opts };
}
function getDefaultTemplate(type) {
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
function styleHeader(sheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
  row.alignment = { horizontal: "center" };
}
var activePdfs, reportService, defaultCss;
var init_reportService = __esm({
  "server/multitenant/services/reportService.ts"() {
    "use strict";
    init_env();
    activePdfs = 0;
    reportService = {
      async exportExcel(db, type, opts) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Aadhirai CRM";
        workbook.created = /* @__PURE__ */ new Date();
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
            { header: "Created", key: "created_at", width: 20 }
          ];
          const params = [];
          const clauses = [];
          if (opts.fromDate) {
            params.push(opts.fromDate);
            clauses.push(`l.created_at >= $${params.length}`);
          }
          if (opts.toDate) {
            params.push(opts.toDate);
            clauses.push(`l.created_at <= $${params.length}`);
          }
          if (opts.stage) {
            params.push(opts.stage);
            clauses.push(`l.stage = $${params.length}`);
          }
          if (opts.assignedTo) {
            params.push(opts.assignedTo);
            clauses.push(`l.assigned_to = $${params.length}`);
          }
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
            { header: "Avg Score", key: "avg_lead_score", width: 12 }
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
      async exportPdf(db, tenantId, type, opts) {
        return withPdfSlot(async () => {
          const tmplResult = await db.query(
            "SELECT html_template, css FROM report_templates WHERE report_key = $1 AND is_active = TRUE LIMIT 1",
            [type]
          );
          let htmlTemplate = tmplResult.rows[0]?.html_template ?? getDefaultTemplate(type);
          const css = tmplResult.rows[0]?.css ?? defaultCss;
          const data = await fetchReportData(db, type, opts);
          const compiled = Handlebars.compile(htmlTemplate);
          const html = `<html><head><style>${css}</style></head><body>${compiled(data)}</body></html>`;
          const tmpFile = path2.join(env.REPORT_TMP_DIR, `report-${tenantId}-${Date.now()}.html`);
          fs3.mkdirSync(env.REPORT_TMP_DIR, { recursive: true });
          fs3.writeFileSync(tmpFile, html);
          let browser;
          try {
            browser = await puppeteer.launch({
              executablePath: env.PUPPETEER_EXECUTABLE_PATH,
              args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
              headless: true
            });
            const page = await browser.newPage();
            await page.goto(`file://${tmpFile}`, { waitUntil: "networkidle0" });
            const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" } });
            return Buffer.from(pdf);
          } finally {
            await browser?.close();
            fs3.unlinkSync(tmpFile);
          }
        });
      }
    };
    defaultCss = `
  body { font-family: Arial, sans-serif; color: #333; }
  h1 { color: #1e40af; } h2 { color: #374151; }
  table { border-collapse: collapse; width: 100%; margin-top: 16px; }
  th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
`;
  }
});

// server/multitenant/queues/followUpQueue.ts
import { Queue as Queue2 } from "bullmq";
function setFollowUpRedisAvailable(v) {
  _redisAvailable2 = v;
}
function getFollowUpQueue() {
  if (!_queue2) {
    _queue2 = new Queue2("crm-followup", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 1e4 },
        removeOnComplete: { count: 500 }
      }
    });
  }
  return _queue2;
}
var _redisAvailable2, _queue2, followUpQueue;
var init_followUpQueue = __esm({
  "server/multitenant/queues/followUpQueue.ts"() {
    "use strict";
    init_redisClient();
    _redisAvailable2 = false;
    _queue2 = null;
    followUpQueue = {
      add: async (...args) => {
        if (!_redisAvailable2) return nullQueue.add();
        return getFollowUpQueue().add(...args);
      }
    };
  }
});

// server/multitenant/services/emailService.ts
import axios2 from "axios";
var emailService;
var init_emailService = __esm({
  "server/multitenant/services/emailService.ts"() {
    "use strict";
    init_env();
    init_logger();
    emailService = {
      async send(to, subject, htmlBody, toName) {
        if (!to) throw new Error("Email recipient is empty");
        const payload = {
          personalizations: [{ to: [{ email: to, name: toName ?? to }] }],
          from: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
          subject,
          content: [{ type: "text/html", value: htmlBody }]
        };
        const res = await axios2.post(
          "https://api.sendgrid.com/v3/mail/send",
          payload,
          {
            headers: {
              Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );
        const msgId = res.headers["x-message-id"] ?? `sg-${Date.now()}`;
        logger_default.debug({ to, subject, msgId }, "Email sent via SendGrid");
        return msgId;
      }
    };
  }
});

// server/multitenant/services/smsService.ts
var smsService_exports = {};
__export(smsService_exports, {
  smsService: () => smsService
});
import axios3 from "axios";
var smsService;
var init_smsService = __esm({
  "server/multitenant/services/smsService.ts"() {
    "use strict";
    init_env();
    init_logger();
    smsService = {
      async send(phone, message) {
        const mobileNo = phone.replace(/\D/g, "");
        const mobile = mobileNo.startsWith("91") ? mobileNo : `91${mobileNo}`;
        const res = await axios3.post(
          "https://api.msg91.com/api/v5/flow/",
          {
            template_id: env.MSG91_OTP_TEMPLATE_ID,
            short_url: "0",
            realTimeResponse: "1",
            recipients: [{ mobiles: mobile, message }]
          },
          {
            headers: {
              authkey: env.MSG91_AUTH_KEY ?? "",
              "Content-Type": "application/json"
            }
          }
        );
        const msgId = res.data?.request_id ?? `msg91-${Date.now()}`;
        logger_default.debug({ mobile, msgId }, "SMS sent via Msg91");
        return msgId;
      },
      async sendOtp(phone, otp) {
        const mobile = phone.replace(/\D/g, "");
        const res = await axios3.post(
          `https://api.msg91.com/api/v5/otp?template_id=${env.MSG91_OTP_TEMPLATE_ID}&mobile=91${mobile}&otp=${otp}`,
          {},
          { headers: { authkey: env.MSG91_AUTH_KEY ?? "" } }
        );
        return res.data?.request_id ?? "";
      }
    };
  }
});

// server/multitenant/services/ivrService.ts
import axios4 from "axios";
var ivrService;
var init_ivrService = __esm({
  "server/multitenant/services/ivrService.ts"() {
    "use strict";
    init_env();
    init_logger();
    ivrService = {
      async initiateCall(phone, appId) {
        const mobile = phone.replace(/\D/g, "");
        const toNumber = mobile.startsWith("0") ? mobile : `0${mobile}`;
        const url = `https://${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}@${env.EXOTEL_SUBDOMAIN}/v1/Accounts/${env.EXOTEL_SID}/Calls/connect.json`;
        const params = new URLSearchParams({
          From: toNumber,
          To: env.EXOTEL_CALLER_ID ?? "",
          CallerId: env.EXOTEL_CALLER_ID ?? "",
          Url: `http://my.exotel.com/${env.EXOTEL_SID}/exoml/start_voice/${appId}`,
          StatusCallback: `${process.env.APP_PUBLIC_URL ?? ""}/api/webhooks/exotel/status`,
          StatusCallbackContentType: "application/json"
        });
        const res = await axios4.post(url, params, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        const callSid = res.data?.Call?.Sid;
        logger_default.debug({ phone, callSid }, "IVR call initiated via Exotel");
        return callSid;
      }
    };
  }
});

// server/multitenant/queues/communicationQueue.ts
import { Queue as Queue3 } from "bullmq";
function setCommunicationRedisAvailable(v) {
  _redisAvailable3 = v;
}
function getCommunicationQueue() {
  if (!_queue3) {
    _queue3 = new Queue3("crm-communication", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3e3 },
        removeOnComplete: { count: 2e3 },
        removeOnFail: { count: 500 }
      }
    });
  }
  return _queue3;
}
var _redisAvailable3, _queue3, communicationQueue;
var init_communicationQueue = __esm({
  "server/multitenant/queues/communicationQueue.ts"() {
    "use strict";
    init_redisClient();
    _redisAvailable3 = false;
    _queue3 = null;
    communicationQueue = {
      add: async (...args) => {
        if (!_redisAvailable3) return nullQueue.add();
        return getCommunicationQueue().add(...args);
      }
    };
  }
});

// server/multitenant/services/communicationService.ts
var communicationService;
var init_communicationService = __esm({
  "server/multitenant/services/communicationService.ts"() {
    "use strict";
    init_whatsappService();
    init_emailService();
    init_smsService();
    init_ivrService();
    init_communicationQueue();
    init_socketEmitter();
    communicationService = {
      // Enqueue a message for async dispatch
      async send(db, tenantId, payload, sentBy) {
        const lead = await db.query(
          "SELECT phone, email, full_name FROM leads WHERE id = $1",
          [payload.leadId]
        );
        if (!lead.rows[0]) throw Object.assign(new Error("Lead not found"), { status: 404 });
        let body = payload.body;
        let subject = payload.subject;
        if (payload.templateId) {
          const tmpl = await db.query(
            "SELECT * FROM message_templates WHERE id = $1",
            [payload.templateId]
          );
          if (tmpl.rows[0]) {
            body = tmpl.rows[0].body;
            subject = tmpl.rows[0].subject;
          }
        }
        const log = await db.query(
          `INSERT INTO communication_logs
         (lead_id, task_id, channel, direction, status, template_id, subject, body, sent_by)
       VALUES ($1,$2,$3,'outbound','queued',$4,$5,$6,$7) RETURNING id`,
          [payload.leadId, payload.taskId ?? null, payload.channel, payload.templateId ?? null, subject ?? null, body, sentBy ?? null]
        );
        const logId = log.rows[0].id;
        await communicationQueue.add("dispatch", {
          tenantId,
          logId,
          leadId: payload.leadId,
          channel: payload.channel,
          phone: lead.rows[0].phone,
          email: lead.rows[0].email,
          fullName: lead.rows[0].full_name,
          subject,
          body,
          templateId: payload.templateId
        }, {
          attempts: 3,
          backoff: { type: "exponential", delay: 3e3 },
          removeOnComplete: { count: 2e3 }
        });
        return { logId };
      },
      // Called by communicationWorker — actual dispatch
      async dispatch(params) {
        let externalId;
        try {
          if (params.channel === "whatsapp") {
            externalId = await whatsappService.sendText(params.phone, params.body);
          } else if (params.channel === "email") {
            externalId = await emailService.send(
              params.email ?? "",
              params.subject ?? "Message from CRM",
              params.body,
              params.fullName
            );
          } else if (params.channel === "sms") {
            externalId = await smsService.send(params.phone, params.body);
          } else if (params.channel === "ivr") {
            const appId = params.body?.trim() || process.env.EXOTEL_DEFAULT_APP_ID || "default";
            externalId = await ivrService.initiateCall(params.phone, appId);
          }
          await params.db.query(
            `UPDATE communication_logs
         SET status = 'sent', sent_at = now(), external_message_id = $1
         WHERE id = $2`,
            [externalId ?? null, params.logId]
          );
          await params.db.query(
            `UPDATE leads SET last_contacted_at = now(), updated_at = now()
         WHERE id = (SELECT lead_id FROM communication_logs WHERE id = $1)`,
            [params.logId]
          );
        } catch (err) {
          await params.db.query(
            "UPDATE communication_logs SET status = 'failed', error_message = $1 WHERE id = $2",
            [err.message, params.logId]
          );
          throw err;
        }
      },
      async updateDeliveryStatus(db, tenantId, externalMessageId, status, timestamp2) {
        const col = status === "delivered" ? "delivered_at" : status === "read" ? "read_at" : null;
        const ts = timestamp2 ?? /* @__PURE__ */ new Date();
        await db.query(
          `UPDATE communication_logs
       SET status = $1 ${col ? `, ${col} = $3` : ""}
       WHERE external_message_id = $2`,
          col ? [status, externalMessageId, ts] : [status, externalMessageId]
        );
        const log = await db.query(
          "SELECT lead_id FROM communication_logs WHERE external_message_id = $1",
          [externalMessageId]
        );
        if (log.rows[0]) {
          const event = status === "replied" ? "message:replied" : "message:delivered";
          emitToTenant(tenantId, event, { leadId: log.rows[0].lead_id, messageId: externalMessageId });
        }
      }
    };
  }
});

// server/multitenant/queues/slaQueue.ts
var slaQueue_exports = {};
__export(slaQueue_exports, {
  startSlaCron: () => startSlaCron
});
import { Queue as Queue4 } from "bullmq";
function getSlaQueue() {
  if (!_queue4) {
    _queue4 = new Queue4("crm-sla", { connection: getRedisConnection() });
  }
  return _queue4;
}
async function startSlaCron(tenantIds) {
  const q = getSlaQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `sla-scan-${tenantId}`,
      { every: 15 * 60 * 1e3 },
      // every 15 min
      {
        name: "sla-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 10 } }
      }
    );
  }
}
var _queue4;
var init_slaQueue = __esm({
  "server/multitenant/queues/slaQueue.ts"() {
    "use strict";
    init_redisClient();
    _queue4 = null;
  }
});

// server/multitenant/queues/reEngagementQueue.ts
var reEngagementQueue_exports = {};
__export(reEngagementQueue_exports, {
  startReEngagementCron: () => startReEngagementCron
});
import { Queue as Queue5 } from "bullmq";
function getReEngagementQueue() {
  if (!_queue5) {
    _queue5 = new Queue5("crm-reengagement", { connection: getRedisConnection() });
  }
  return _queue5;
}
async function startReEngagementCron(tenantIds) {
  const q = getReEngagementQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `reengagement-daily-${tenantId}`,
      { pattern: "0 9 * * *", tz: "Asia/Kolkata" },
      {
        name: "reengagement-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } }
      }
    );
  }
}
var _queue5;
var init_reEngagementQueue = __esm({
  "server/multitenant/queues/reEngagementQueue.ts"() {
    "use strict";
    init_redisClient();
    _queue5 = null;
  }
});

// server/multitenant/queues/installmentQueue.ts
var installmentQueue_exports = {};
__export(installmentQueue_exports, {
  startInstallmentCron: () => startInstallmentCron
});
import { Queue as Queue6 } from "bullmq";
function getInstallmentQueue() {
  if (!_queue6) {
    _queue6 = new Queue6("crm-installments", { connection: getRedisConnection() });
  }
  return _queue6;
}
async function startInstallmentCron(tenantIds) {
  const q = getInstallmentQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `installment-scan-${tenantId}`,
      { pattern: "30 3 * * *", tz: "Asia/Kolkata" },
      {
        name: "installment-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } }
      }
    );
  }
}
var _queue6;
var init_installmentQueue = __esm({
  "server/multitenant/queues/installmentQueue.ts"() {
    "use strict";
    init_redisClient();
    _queue6 = null;
  }
});

// server/multitenant/queues/index.ts
var init_queues = __esm({
  "server/multitenant/queues/index.ts"() {
    "use strict";
    init_redisClient();
    init_automationQueue();
    init_communicationQueue();
    init_followUpQueue();
    init_slaQueue();
    init_reEngagementQueue();
    init_installmentQueue();
  }
});

// server/multitenant/workers/automationWorker.ts
var automationWorker_exports = {};
__export(automationWorker_exports, {
  startAutomationWorker: () => startAutomationWorker
});
import { Worker } from "bullmq";
function startAutomationWorker() {
  const worker = new Worker(
    "crm-automation",
    async (job) => {
      const { tenantId, ruleId, leadId, actions } = job.data;
      const db = await getPool(tenantId);
      const actionsTaken = [];
      for (const action of actions) {
        try {
          if (action.type === "send_message") {
            const a = action;
            let body = a.body ?? "";
            let subject;
            if (a.templateId) {
              const tmpl = await db.query(
                "SELECT body, subject FROM message_templates WHERE id = $1 AND is_active = TRUE",
                [a.templateId]
              );
              if (tmpl.rows[0]) {
                body = tmpl.rows[0].body;
                subject = tmpl.rows[0].subject ?? void 0;
              }
            }
            if (!body) {
              logger_default.warn({ ruleId, leadId, action }, "send_message action has no body/template \u2014 skipping");
            } else {
              await communicationService.send(db, tenantId, {
                leadId,
                channel: a.channel,
                templateId: a.templateId,
                subject,
                body
              });
              actionsTaken.push({ type: "send_message", channel: a.channel });
            }
          } else if (action.type === "assign_task") {
            const a = action;
            const dueAt = new Date(Date.now() + a.dueHours * 36e5);
            const lead = await db.query("SELECT assigned_to FROM leads WHERE id = $1", [leadId]);
            const assignedTo = lead.rows[0]?.assigned_to;
            if (assignedTo) {
              const task = await db.query(
                `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
                 VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING id`,
                [leadId, assignedTo, a.taskType, a.title, a.priority ?? "medium", dueAt]
              );
              notificationService.notify(
                db,
                tenantId,
                assignedTo,
                "task_assigned",
                `New task: ${a.title}`,
                { leadId, taskId: task.rows[0]?.id }
              ).catch(() => {
              });
            }
            actionsTaken.push({ type: "assign_task", title: a.title });
          } else if (action.type === "escalate") {
            const a = action;
            const target = a.toUserId ?? await getManagerId(db);
            if (target) {
              const task = await db.query(
                `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
                 VALUES ($1,$2,'follow_up',$3,'pending','urgent', now() + interval '2 hours') RETURNING id`,
                [leadId, target, a.message ?? "Escalation: action required"]
              );
              notificationService.notify(
                db,
                tenantId,
                target,
                "escalation",
                a.message ?? "Escalation: action required",
                { leadId, taskId: task.rows[0]?.id }
              ).catch(() => {
              });
            }
            actionsTaken.push({ type: "escalate" });
          } else if (action.type === "change_stage") {
            const a = action;
            await db.query(
              "UPDATE leads SET stage = $1, updated_at = now() WHERE id = $2",
              [a.toStage, leadId]
            );
            await db.query(
              "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,NULL,'Automation rule')",
              [leadId, a.toStage]
            );
            actionsTaken.push({ type: "change_stage", toStage: a.toStage });
          } else if (action.type === "reassign") {
            const a = action;
            await db.query(
              "UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id = $2",
              [a.toUserId, leadId]
            );
            actionsTaken.push({ type: "reassign", toUserId: a.toUserId });
          }
        } catch (err) {
          logger_default.error({ err, action, leadId }, "Automation action failed");
        }
      }
      await db.query(
        `INSERT INTO automation_execution_log (rule_id, lead_id, actions_taken, status)
         VALUES ($1, $2, $3, 'success')`,
        [ruleId, leadId, JSON.stringify(actionsTaken)]
      );
      await db.query(
        "UPDATE automation_rules SET execution_count = execution_count + 1 WHERE id = $1",
        [ruleId]
      );
      logger_default.info({ ruleId, leadId, tenantId, actionsCount: actionsTaken.length }, "Automation rule executed");
    },
    { connection: getRedisConnection(), concurrency: 10 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Automation job failed");
  });
  return worker;
}
async function getManagerId(db) {
  const res = await db.query(
    "SELECT id FROM users WHERE role IN ('manager','admin') AND is_active = TRUE ORDER BY role DESC LIMIT 1"
  );
  return res.rows[0]?.id ?? null;
}
var init_automationWorker = __esm({
  "server/multitenant/workers/automationWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_communicationService();
    init_notificationService();
    init_logger();
  }
});

// server/multitenant/workers/communicationWorker.ts
var communicationWorker_exports = {};
__export(communicationWorker_exports, {
  startCommunicationWorker: () => startCommunicationWorker
});
import { Worker as Worker2 } from "bullmq";
function startCommunicationWorker() {
  const worker = new Worker2(
    "crm-communication",
    async (job) => {
      const { tenantId, logId, channel, phone, email, fullName, subject, body } = job.data;
      const db = await getPool(tenantId);
      await communicationService.dispatch({
        logId,
        channel,
        phone,
        email,
        fullName,
        subject,
        body,
        db
      });
      await db.query(
        "UPDATE leads SET last_contacted_at = now(), updated_at = now() WHERE id = $1",
        [job.data.leadId]
      );
      const { leadScoringService: leadScoringService2 } = await Promise.resolve().then(() => (init_leadScoringService(), leadScoringService_exports));
      await leadScoringService2.recalculate(db, job.data.leadId);
      logger_default.info({ logId, channel, tenantId }, "Message dispatched");
    },
    { connection: getRedisConnection(), concurrency: 20 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Communication job failed");
  });
  return worker;
}
var init_communicationWorker = __esm({
  "server/multitenant/workers/communicationWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_communicationService();
    init_logger();
  }
});

// server/multitenant/workers/slaWorker.ts
var slaWorker_exports = {};
__export(slaWorker_exports, {
  startSlaWorker: () => startSlaWorker
});
import { Worker as Worker3 } from "bullmq";
function startSlaWorker() {
  const worker = new Worker3(
    "crm-sla",
    async (job) => {
      const { tenantId } = job.data;
      const db = await getPool(tenantId);
      const overdueTasks = await db.query(`
        UPDATE tasks
        SET status = 'overdue', updated_at = now()
        WHERE status = 'pending'
          AND due_at < now()
        RETURNING id, lead_id, assigned_to
      `);
      for (const t of overdueTasks.rows) {
        emitToTenant(tenantId, "task:overdue", { taskId: t.id, leadId: t.lead_id });
        if (t.assigned_to) {
          notificationService.notify(
            db,
            tenantId,
            t.assigned_to,
            "task_overdue",
            "Task overdue",
            { leadId: t.lead_id, taskId: t.id }
          ).catch(() => {
          });
        }
      }
      const breaches = await db.query(`
        SELECT l.id AS lead_id, sp.id AS policy_id, sp.escalate_to,
               sp.max_response_hours
        FROM leads l
        JOIN sla_policies sp ON sp.stage = l.stage::TEXT AND sp.is_active = TRUE
        WHERE l.stage NOT IN ('admitted','lost')
          AND l.last_contacted_at IS NOT NULL
          AND l.last_contacted_at < now() - (sp.max_response_hours || ' hours')::INTERVAL
          AND NOT EXISTS (
            SELECT 1 FROM sla_tracking st
            WHERE st.lead_id = l.id
              AND st.policy_id = sp.id
              AND st.breached = TRUE
              AND st.breached_at > now() - interval '24 hours'
          )
      `);
      for (const row of breaches.rows) {
        await db.query(
          `INSERT INTO sla_tracking (lead_id, policy_id, breached, breached_at)
           VALUES ($1, $2, TRUE, now())
           ON CONFLICT (lead_id, policy_id) DO NOTHING`,
          [row.lead_id, row.policy_id]
        );
        if (row.escalate_to) {
          await db.query(
            `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
             VALUES ($1,$2,'follow_up','SLA Breach - Immediate action required','pending','urgent', now() + interval '1 hour')`,
            [row.lead_id, row.escalate_to]
          );
        }
        if (row.escalate_to) {
          try {
            const ctx = await db.query(
              `SELECT l.full_name AS lead_name, l.phone AS lead_phone, l.stage,
                      u_manager.phone AS manager_phone, u_manager.full_name AS manager_name,
                      u_counsellor.full_name AS counsellor_name
               FROM leads l
               LEFT JOIN users u_manager ON u_manager.id = $2
               LEFT JOIN users u_counsellor ON u_counsellor.id = l.assigned_to
               WHERE l.id = $1`,
              [row.lead_id, row.escalate_to]
            );
            const c = ctx.rows[0];
            if (c?.manager_phone) {
              const msg = `SLA Alert \u2014 Lead "${c.lead_name}" (${c.stage}) has not been contacted in over ${row.max_response_hours}h. Assigned to: ${c.counsellor_name ?? "unassigned"}. Please follow up immediately.`;
              await whatsappService.sendText(c.manager_phone, msg);
              logger_default.info({ tenantId, leadId: row.lead_id, managerId: row.escalate_to }, "SLA WhatsApp escalation sent");
            }
          } catch (err) {
            logger_default.warn({ tenantId, leadId: row.lead_id, err }, "SLA WhatsApp escalation failed");
          }
        }
        emitToTenant(tenantId, "sla:breached", { leadId: row.lead_id, taskId: null });
        if (row.escalate_to) {
          notificationService.notify(
            db,
            tenantId,
            row.escalate_to,
            "sla_breach",
            "SLA Breach detected",
            { leadId: row.lead_id }
          ).catch(() => {
          });
        }
        logger_default.warn({ tenantId, leadId: row.lead_id }, "SLA breach detected");
      }
      logger_default.info({ tenantId, breachCount: breaches.rowCount }, "SLA scan complete");
    },
    { connection: getRedisConnection(), concurrency: 5 }
  );
  return worker;
}
var init_slaWorker = __esm({
  "server/multitenant/workers/slaWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_socketEmitter();
    init_notificationService();
    init_whatsappService();
    init_logger();
  }
});

// server/multitenant/workers/followUpWorker.ts
var followUpWorker_exports = {};
__export(followUpWorker_exports, {
  startFollowUpWorker: () => startFollowUpWorker
});
import { Worker as Worker4 } from "bullmq";
function startFollowUpWorker() {
  const worker = new Worker4(
    "crm-followup",
    async (job) => {
      if (job.name === "demo-reminder") {
        const { leadName, leadPhone, scheduledAt, mode, location, tenantId: tenantId2, demoId } = job.data;
        if (!leadPhone) return;
        const demoDate = new Date(scheduledAt);
        const timeStr = demoDate.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata"
        });
        const locText = location ? ` at ${location}` : "";
        const modeText = mode === "online" ? "online" : "in person";
        const msg = `Hi ${leadName}, this is a reminder for your demo session ${modeText}${locText} scheduled at ${timeStr}. Please be on time. Looking forward to meeting you! Reply STOP to cancel.`;
        try {
          await whatsappService.sendText(leadPhone, msg);
          logger_default.info({ demoId, leadPhone, tenantId: tenantId2 }, "Demo reminder WhatsApp sent");
        } catch (err) {
          logger_default.warn({ demoId, leadPhone, err }, "Demo reminder WhatsApp failed");
        }
        return;
      }
      const { taskId, tenantId } = job.data;
      const db = await getPool(tenantId);
      const result = await db.query(
        `SELECT t.id, t.title, t.lead_id, t.assigned_to, t.due_at,
                l.full_name AS lead_name, u.full_name AS counsellor_name
         FROM tasks t
         JOIN leads l ON t.lead_id = l.id
         JOIN users u ON t.assigned_to = u.id
         WHERE t.id = $1`,
        [taskId]
      );
      if (!result.rows[0]) return;
      const t = result.rows[0];
      const current = await db.query("SELECT status FROM tasks WHERE id = $1", [taskId]);
      if (!["pending", "in_progress"].includes(current.rows[0]?.status)) return;
      await notificationService.notify(
        db,
        tenantId,
        t.assigned_to,
        "task_reminder",
        `Reminder: "${t.title}" for ${t.lead_name} is due soon`,
        { taskId: t.id, leadId: t.lead_id }
      );
      emitToTenant(tenantId, "notification", {
        type: "task_reminder",
        message: `Task "${t.title}" is due soon`,
        severity: "warning"
      });
      logger_default.info({ taskId, tenantId }, "Follow-up reminder sent");
    },
    { connection: getRedisConnection(), concurrency: 20 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Follow-up job failed");
  });
  return worker;
}
var init_followUpWorker = __esm({
  "server/multitenant/workers/followUpWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_notificationService();
    init_whatsappService();
    init_socketEmitter();
    init_logger();
  }
});

// server/multitenant/workers/reEngagementWorker.ts
var reEngagementWorker_exports = {};
__export(reEngagementWorker_exports, {
  startReEngagementWorker: () => startReEngagementWorker
});
import { Worker as Worker5 } from "bullmq";
function startReEngagementWorker() {
  const worker = new Worker5(
    "crm-reengagement",
    async (job) => {
      const { tenantId } = job.data;
      const db = await getPool(tenantId);
      const campaigns2 = await db.query(
        "SELECT * FROM reengagement_campaigns WHERE is_active = TRUE"
      );
      for (const campaign of campaigns2.rows) {
        const dormantLeads = await db.query(
          `SELECT l.id, l.phone, l.email, l.full_name
           FROM leads l
           WHERE l.re_engagement_eligible = TRUE
             AND l.stage NOT IN ('admitted', 'lost')
             ${campaign.target_stage ? "AND l.stage = $2" : ""}
             AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
             AND NOT EXISTS (
               SELECT 1 FROM reengagement_log rl
               WHERE rl.lead_id = l.id
                 AND rl.campaign_id = $${campaign.target_stage ? 3 : 2}
                 AND rl.attempt_number >= $${campaign.target_stage ? 4 : 3}
             )
           LIMIT 100`,
          campaign.target_stage ? [campaign.dormant_days, campaign.target_stage, campaign.id, campaign.max_attempts] : [campaign.dormant_days, campaign.id, campaign.max_attempts]
        );
        let sentCount = 0;
        for (const lead of dormantLeads.rows) {
          try {
            const attempt = await db.query(
              "SELECT COALESCE(MAX(attempt_number), 0) AS last_attempt FROM reengagement_log WHERE lead_id = $1 AND campaign_id = $2",
              [lead.id, campaign.id]
            );
            const attemptNum = parseInt(attempt.rows[0].last_attempt) + 1;
            if (attemptNum > campaign.max_attempts) continue;
            if (campaign.template_id) {
              await communicationService.send(db, tenantId, {
                leadId: lead.id,
                channel: campaign.channel,
                templateId: campaign.template_id,
                body: ""
              });
            }
            await db.query(
              `INSERT INTO reengagement_log (campaign_id, lead_id, attempt_number)
               VALUES ($1,$2,$3)`,
              [campaign.id, lead.id, attemptNum]
            );
            sentCount++;
          } catch (err) {
            logger_default.warn({ err, leadId: lead.id }, "Re-engagement send failed");
          }
        }
        if (sentCount > 0) {
          logger_default.info({ tenantId, campaignId: campaign.id, sentCount }, "Re-engagement batch sent");
        }
      }
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Re-engagement job failed");
  });
  return worker;
}
var init_reEngagementWorker = __esm({
  "server/multitenant/workers/reEngagementWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_communicationService();
    init_logger();
  }
});

// server/multitenant/workers/installmentWorker.ts
var installmentWorker_exports = {};
__export(installmentWorker_exports, {
  startInstallmentWorker: () => startInstallmentWorker
});
import { Worker as Worker6 } from "bullmq";
function startInstallmentWorker() {
  const worker = new Worker6(
    "crm-installments",
    async (job) => {
      const { tenantId } = job.data;
      const db = await getPool(tenantId);
      const flipped = await db.query(`
        UPDATE payment_installments
        SET status = 'overdue', updated_at = now()
        WHERE status = 'pending' AND due_date < CURRENT_DATE
        RETURNING id, lead_id, amount, due_date, installment_no
      `);
      if (flipped.rowCount) {
        logger_default.info({ tenantId, count: flipped.rowCount }, "Installments marked overdue");
      }
      const overdueRows = await db.query(`
        SELECT pi.id, pi.lead_id, pi.amount, pi.due_date, pi.installment_no,
               l.full_name AS lead_name, l.phone AS lead_phone
        FROM payment_installments pi
        JOIN leads l ON l.id = pi.lead_id
        WHERE pi.status = 'overdue'
          AND l.phone IS NOT NULL
          AND (pi.reminder_sent_at IS NULL OR pi.reminder_sent_at::date < CURRENT_DATE)
        LIMIT 200
      `);
      for (const row of overdueRows.rows) {
        try {
          const msg = `Hi ${row.lead_name}, your installment #${row.installment_no} of \u20B9${parseFloat(row.amount).toLocaleString("en-IN")} was due on ${new Date(row.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Please clear this at the earliest. Contact us for any queries.`;
          await whatsappService.sendText(row.lead_phone, msg);
          await db.query(
            "UPDATE payment_installments SET reminder_sent_at = now() WHERE id = $1",
            [row.id]
          );
        } catch (err) {
          logger_default.warn({ tenantId, installmentId: row.id, err }, "Overdue WA reminder failed");
        }
      }
      const upcomingRows = await db.query(`
        SELECT pi.id, pi.lead_id, pi.amount, pi.due_date, pi.installment_no,
               l.full_name AS lead_name, l.phone AS lead_phone
        FROM payment_installments pi
        JOIN leads l ON l.id = pi.lead_id
        WHERE pi.status = 'pending'
          AND pi.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '3 days'
          AND l.phone IS NOT NULL
          AND pi.reminder_sent_at IS NULL
        LIMIT 200
      `);
      for (const row of upcomingRows.rows) {
        try {
          const msg = `Hi ${row.lead_name}, a friendly reminder that installment #${row.installment_no} of \u20B9${parseFloat(row.amount).toLocaleString("en-IN")} is due on ${new Date(row.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}. Please arrange payment on time. Thank you!`;
          await whatsappService.sendText(row.lead_phone, msg);
          await db.query(
            "UPDATE payment_installments SET reminder_sent_at = now() WHERE id = $1",
            [row.id]
          );
        } catch (err) {
          logger_default.warn({ tenantId, installmentId: row.id, err }, "Upcoming WA reminder failed");
        }
      }
      logger_default.info(
        { tenantId, overdue: overdueRows.rowCount, upcoming: upcomingRows.rowCount },
        "Installment scan complete"
      );
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Installment job failed");
  });
  return worker;
}
var init_installmentWorker = __esm({
  "server/multitenant/workers/installmentWorker.ts"() {
    "use strict";
    init_queues();
    init_dbPool();
    init_whatsappService();
    init_logger();
  }
});

// server/multitenant/workers/npsWorker.ts
var npsWorker_exports = {};
__export(npsWorker_exports, {
  startNpsWorker: () => startNpsWorker
});
import { Worker as Worker7 } from "bullmq";
function startNpsWorker() {
  const worker = new Worker7(
    "crm-nps",
    async (job) => {
      if (job.name !== "nps-scan") return;
      const { tenantId } = job.data;
      const db = await getPool(tenantId);
      const autoCompleted = await db.query(
        `UPDATE enrollments e
         SET completion_date = b.end_date
         FROM batches b
         WHERE e.batch_id = b.id
           AND b.end_date IS NOT NULL
           AND b.end_date::date < CURRENT_DATE
           AND e.completion_date IS NULL
         RETURNING e.lead_id, e.batch_id, b.course_id`
      );
      if (autoCompleted.rowCount && autoCompleted.rowCount > 0) {
        logger_default.info({ tenantId, count: autoCompleted.rowCount }, "Auto-completed enrollments for expired batches");
      }
      const completions = await db.query(
        `SELECT e.lead_id, e.batch_id, e.id AS enrollment_id, b.course_id,
                l.full_name, l.phone
         FROM enrollments e
         JOIN leads l ON l.id = e.lead_id
         JOIN batches b ON b.id = e.batch_id
         WHERE e.completion_date::date = (now() - interval '1 day')::date
           AND NOT EXISTS (
             SELECT 1 FROM nps_responses n
             WHERE n.lead_id = e.lead_id AND n.batch_id = e.batch_id
           )`
      );
      let sent = 0;
      for (const row of completions.rows) {
        try {
          await db.query(
            `INSERT INTO nps_responses (lead_id, batch_id, course_id, sent_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT DO NOTHING`,
            [row.lead_id, row.batch_id, row.course_id]
          );
          const msg = `Hi ${row.full_name}, congratulations on completing your course! \u{1F393}
On a scale of 0\u201310, how likely are you to recommend us to a friend or colleague?
Reply with just a number (0-10) and any feedback you'd like to share.`;
          await whatsappService.sendText(row.phone, msg);
          sent++;
        } catch (err) {
          logger_default.warn({ tenantId, leadId: row.lead_id, err }, "NPS survey send failed");
        }
      }
      logger_default.info({ tenantId, sent }, "NPS scan complete");
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "NPS worker job failed");
  });
  return worker;
}
var init_npsWorker = __esm({
  "server/multitenant/workers/npsWorker.ts"() {
    "use strict";
    init_redisClient();
    init_dbPool();
    init_whatsappService();
    init_logger();
  }
});

// server/multitenant/workers/digestWorker.ts
var digestWorker_exports = {};
__export(digestWorker_exports, {
  startDigestWorker: () => startDigestWorker
});
import { Worker as Worker8 } from "bullmq";
function startDigestWorker() {
  const worker = new Worker8(
    "crm-digest",
    async (job) => {
      if (job.name !== "daily-digest") return;
      const { tenantId } = job.data;
      const db = await getPool(tenantId);
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDate = yesterday.toISOString().slice(0, 10);
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const [newLeads, demosToday, overdueTasks, callStats, feesYesterday, managers] = await Promise.all([
        // New leads yesterday
        db.query(
          `SELECT COUNT(*) AS cnt FROM leads WHERE created_at::date = $1`,
          [yDate]
        ),
        // Demos today
        db.query(
          `SELECT COUNT(*) AS cnt FROM demo_sessions WHERE scheduled_at::date = $1 AND status='scheduled'`,
          [today]
        ),
        // Overdue open tasks
        db.query(
          `SELECT COUNT(*) AS cnt FROM tasks WHERE due_at < now() AND status NOT IN ('done','cancelled')`
        ),
        // Counsellor call stats yesterday
        db.query(
          `SELECT u.full_name, COUNT(a.id) AS calls,
                    ct.calls_target AS target
             FROM users u
             LEFT JOIN activity_logs a ON a.user_id = u.id
               AND a.activity_type = 'call'
               AND a.activity_date::date = $1
             LEFT JOIN counsellor_targets ct ON ct.user_id = u.id
             WHERE u.role = 'counsellor' AND u.is_active = TRUE
             GROUP BY u.full_name, ct.calls_target
             ORDER BY calls DESC`,
          [yDate]
        ),
        // Fees collected yesterday
        db.query(
          `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
             FROM payments WHERE status='completed' AND paid_at::date = $1`,
          [yDate]
        ),
        // Managers & admins with phones
        db.query(
          `SELECT full_name, phone FROM users
             WHERE role IN ('admin','manager') AND is_active = TRUE AND phone IS NOT NULL`
        )
      ]);
      if (!managers.rows.length) {
        logger_default.info({ tenantId }, "Digest: no managers with phone, skipping");
        return;
      }
      const newLeadCnt = parseInt(newLeads.rows[0].cnt);
      const demosCnt = parseInt(demosToday.rows[0].cnt);
      const overdueTask = parseInt(overdueTasks.rows[0].cnt);
      const feesTotal = parseFloat(feesYesterday.rows[0].total);
      const feesCnt = parseInt(feesYesterday.rows[0].count);
      const callLines = callStats.rows.map((r) => `  \u2022 ${r.full_name}: ${r.calls}${r.target ? `/${r.target}` : ""} calls`).join("\n");
      const dateStr = yesterday.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      const msg = [
        `\u{1F4CA} *Daily CRM Digest \u2014 ${dateStr}*`,
        ``,
        `\u{1F195} New Leads: *${newLeadCnt}*`,
        `\u{1F4C5} Demos Today: *${demosCnt}*`,
        `\u26A0\uFE0F Overdue Tasks: *${overdueTask}*`,
        `\u{1F4B0} Fees Collected: *\u20B9${feesTotal.toLocaleString("en-IN")}* (${feesCnt} payment${feesCnt !== 1 ? "s" : ""})`,
        ``,
        callLines ? `\u{1F4DE} Counsellor Calls (Yesterday):
${callLines}` : null
      ].filter(Boolean).join("\n");
      let sent = 0;
      for (const mgr of managers.rows) {
        try {
          await whatsappService.sendText(mgr.phone, msg);
          sent++;
        } catch (err) {
          logger_default.warn({ tenantId, manager: mgr.full_name, err }, "Digest send failed");
        }
      }
      logger_default.info({ tenantId, sent, managers: managers.rowCount }, "Daily digest sent");
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );
  worker.on("failed", (job, err) => {
    logger_default.error({ jobId: job?.id, err }, "Digest worker job failed");
  });
  return worker;
}
var init_digestWorker = __esm({
  "server/multitenant/workers/digestWorker.ts"() {
    "use strict";
    init_redisClient();
    init_dbPool();
    init_whatsappService();
    init_logger();
  }
});

// server/multitenant/queues/npsQueue.ts
var npsQueue_exports = {};
__export(npsQueue_exports, {
  getNpsQueue: () => getNpsQueue,
  startNpsCron: () => startNpsCron
});
import { Queue as Queue7 } from "bullmq";
function getNpsQueue() {
  if (!_queue7) {
    _queue7 = new Queue7("crm-nps", { connection: getRedisConnection() });
  }
  return _queue7;
}
async function startNpsCron(tenantIds) {
  const q = getNpsQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `nps-scan-${tenantId}`,
      { pattern: "30 4 * * *", tz: "Asia/Kolkata" },
      {
        name: "nps-scan",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } }
      }
    );
  }
}
var _queue7;
var init_npsQueue = __esm({
  "server/multitenant/queues/npsQueue.ts"() {
    "use strict";
    init_redisClient();
    _queue7 = null;
  }
});

// server/multitenant/queues/digestQueue.ts
var digestQueue_exports = {};
__export(digestQueue_exports, {
  startDigestCron: () => startDigestCron
});
import { Queue as Queue8 } from "bullmq";
function getDigestQueue() {
  if (!_queue8) {
    _queue8 = new Queue8("crm-digest", { connection: getRedisConnection() });
  }
  return _queue8;
}
async function startDigestCron(tenantIds) {
  const q = getDigestQueue();
  for (const tenantId of tenantIds) {
    await q.upsertJobScheduler(
      `digest-${tenantId}`,
      { pattern: "30 2 * * *", tz: "Asia/Kolkata" },
      {
        name: "daily-digest",
        data: { tenantId },
        opts: { removeOnComplete: { count: 5 }, removeOnFail: { count: 5 } }
      }
    );
  }
}
var _queue8;
var init_digestQueue = __esm({
  "server/multitenant/queues/digestQueue.ts"() {
    "use strict";
    init_redisClient();
    _queue8 = null;
  }
});

// server/multitenant/start.ts
init_env();
init_registry();

// server/multitenant/tenant/ensureReady.ts
init_dbPool();
init_registry();
init_logger();
init_env();
import path from "path";
import fs2 from "fs";
import { fileURLToPath } from "url";
var MIGRATIONS_DIR = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../migrations"
);
async function runMigrations(pool, tenantId) {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [tenantId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_on TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const files = fs2.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const exists = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file]
      );
      if ((exists.rowCount ?? 0) > 0) continue;
      const sql = fs2.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      if (env.MIGRATION_TRANSACTION_ENABLED) {
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations(name) VALUES($1)",
            [file]
          );
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      } else {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(name) VALUES($1)",
          [file]
        );
      }
      logger_default.info({ tenantId, migration: file }, "Migration applied");
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [tenantId]);
    client.release();
  }
}
async function ensureAllTenantsReady() {
  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    await ensureTenantReady(tenantId);
  }
}
async function ensureTenantReady(tenantId) {
  const pool = await getPool(tenantId);
  await runMigrations(pool, tenantId);
  logger_default.info({ tenantId }, "Tenant schema ready");
}

// server/multitenant/server.ts
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// server/multitenant/middleware/security.ts
init_env();
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
var helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: false
});
var corsMiddleware = cors({
  origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  credentials: true
});
var authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20,
  // Stricter for auth endpoints
  message: { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false
});
var apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false
});

// server/multitenant/middleware/errorHandler.ts
init_logger();
function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  logger_default.error({ err, path: req.path, method: req.method }, "Unhandled error");
  if (res.headersSent) return;
  res.status(status).json({
    ok: false,
    code: "INTERNAL_ERROR",
    message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : message
  });
}

// server/multitenant/middleware/patchAsyncErrors.ts
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
function patchAsyncErrors() {
  const Layer = require2("express/lib/router/layer");
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function(req, res, next) {
    try {
      const ret = original.call(this, req, res, next);
      if (ret && typeof ret.catch === "function") {
        ret.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}

// server/multitenant/server.ts
init_env();
init_ioRegistry();

// server/multitenant/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";

// server/multitenant/auth/jwt.ts
init_env();
import jwt from "jsonwebtoken";
var EXPIRY = "7d";
function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRY });
}
function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

// server/multitenant/auth/tenantGuard.ts
init_dbPool();
init_registry();
init_logger();
async function tenantFromHeader(req, res, next) {
  const tenantId = req.headers["x-tenant"];
  if (!tenantId) {
    res.status(400).json({ ok: false, code: "MISSING_TENANT", message: "X-Tenant header required" });
    return;
  }
  const registry = getRegistry();
  if (!registry.tenants[tenantId]) {
    res.status(404).json({ ok: false, code: "TENANT_NOT_FOUND", message: "Unknown tenant" });
    return;
  }
  try {
    req.tenantId = tenantId;
    req.db = await getPool(tenantId);
    next();
  } catch (err) {
    logger_default.error({ err, tenantId }, "Failed to get tenant DB pool");
    res.status(503).json({ ok: false, code: "DB_UNAVAILABLE", message: "Database unavailable" });
  }
}
function authAndTenantGuard(req, res, next) {
  const authHeader2 = req.headers["authorization"];
  if (!authHeader2?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, code: "MISSING_TOKEN", message: "Bearer token required" });
    return;
  }
  const token = authHeader2.slice(7);
  try {
    const payload = verifyToken(token);
    if (payload.tenantId !== req.tenantId) {
      res.status(403).json({ ok: false, code: "TENANT_MISMATCH", message: "Token tenant mismatch" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, code: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}

// shared/types.ts
import { z as z2 } from "zod";
var loginSchema = z2.object({
  username: z2.string().min(1),
  password: z2.string().min(1)
});
var leadQuerySchema = z2.object({
  stage: z2.enum(["new", "contacted", "qualified", "demo", "interested", "payment", "admitted", "lost"]).optional(),
  source: z2.enum(["meta_ads", "website", "manual", "excel_import", "walk_in", "phone", "referral"]).optional(),
  assignedTo: z2.string().uuid().optional(),
  campaignId: z2.string().uuid().optional(),
  search: z2.string().optional(),
  // name / phone / email
  fromDate: z2.string().optional(),
  toDate: z2.string().optional(),
  page: z2.coerce.number().int().min(1).default(1),
  limit: z2.coerce.number().int().min(1).max(200).default(50)
});
var taskQuerySchema = z2.object({
  assignedTo: z2.string().uuid().optional(),
  status: z2.enum(["pending", "in_progress", "done", "overdue", "cancelled"]).optional(),
  dueToday: z2.coerce.boolean().optional(),
  overdue: z2.coerce.boolean().optional(),
  page: z2.coerce.number().int().min(1).default(1),
  limit: z2.coerce.number().int().min(1).max(200).default(50)
});
var sendMessageSchema = z2.object({
  leadId: z2.string().uuid(),
  channel: z2.enum(["whatsapp", "email", "sms", "ivr", "manual_call"]),
  templateId: z2.string().uuid().optional(),
  subject: z2.string().optional(),
  body: z2.string().min(1),
  taskId: z2.string().uuid().optional()
});
var reportExportSchema = z2.object({
  type: z2.enum(["funnel", "counsellor", "campaign_roi", "conversion", "all_leads"]),
  format: z2.enum(["pdf", "excel"]),
  fromDate: z2.string().optional(),
  toDate: z2.string().optional(),
  counsellorId: z2.string().uuid().optional(),
  campaignId: z2.string().uuid().optional()
});

// server/multitenant/routes/auth.ts
var router = Router();
router.post("/login", authRateLimit, tenantFromHeader, async (req, res) => {
  const parsed2 = loginSchema.safeParse(req.body);
  if (!parsed2.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: "Invalid input" });
    return;
  }
  const { username, password } = parsed2.data;
  const result = await req.db.query(
    "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
    [username]
  );
  const user = result.rows[0];
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    return;
  }
  const token = signToken({ sub: user.id, tenantId: req.tenantId, role: user.role });
  res.json({
    ok: true,
    token,
    tenantId: req.tenantId,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      email: user.email
    }
  });
});
router.get(
  "/me",
  tenantFromHeader,
  authAndTenantGuard,
  async (req, res) => {
    const result = await req.db.query(
      "SELECT id, username, full_name, email, phone, role FROM users WHERE id = $1",
      [req.user.sub]
    );
    if (!result.rows[0]) {
      res.status(404).json({ ok: false, code: "NOT_FOUND", message: "User not found" });
      return;
    }
    res.json({ ok: true, data: result.rows[0] });
  }
);
var auth_default = router;

// server/multitenant/routes/leads.ts
import { Router as Router2 } from "express";

// server/multitenant/services/duplicateDetectionService.ts
var duplicateDetectionService = {
  async check(db, data) {
    const byPhone = await db.query(
      "SELECT id, lead_no FROM leads WHERE phone = $1 AND is_duplicate = FALSE LIMIT 1",
      [data.phone]
    );
    if (byPhone.rows[0]) {
      return {
        isDuplicate: true,
        matchedLeadId: byPhone.rows[0].id,
        matchedLeadNo: byPhone.rows[0].lead_no,
        confidence: "exact_phone"
      };
    }
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
          confidence: "exact_email"
        };
      }
    }
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
        confidence: "fuzzy_name"
      };
    }
    return { isDuplicate: false, confidence: "none" };
  },
  async merge(db, duplicateId, masterId, mergedBy) {
    await db.query("UPDATE tasks SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE communication_logs SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE lead_stage_history SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query("UPDATE opportunities SET lead_id = $1 WHERE lead_id = $2", [masterId, duplicateId]);
    await db.query(
      "UPDATE leads SET is_duplicate = TRUE, duplicate_of = $1, updated_at = now() WHERE id = $2",
      [masterId, duplicateId]
    );
    return { merged: duplicateId, into: masterId };
  }
};

// server/multitenant/services/leadService.ts
init_leadScoringService();

// server/multitenant/services/automationService.ts
init_automationQueue();
init_logger();
var automationService = {
  async processEvent(db, tenantId, event, leadId, context = {}) {
    const rules = await db.query(
      `SELECT * FROM automation_rules
       WHERE trigger_event = $1 AND is_active = TRUE
       ORDER BY created_at ASC`,
      [event]
    );
    for (const rule of rules.rows) {
      if (rule.trigger_conditions) {
        const conditions = rule.trigger_conditions;
        const match = Object.entries(conditions).every(
          ([k, v]) => context[k] === v
        );
        if (!match) continue;
      }
      await automationQueue.add(
        "execute-rule",
        {
          tenantId,
          ruleId: rule.id,
          leadId,
          actions: rule.actions,
          context
        },
        {
          delay: rule.delay_minutes * 60 * 1e3,
          attempts: 3,
          backoff: { type: "exponential", delay: 5e3 },
          removeOnComplete: { count: 1e3 },
          removeOnFail: { count: 500 }
        }
      );
      logger_default.debug({ ruleId: rule.id, leadId, event }, "Automation rule enqueued");
    }
  }
};

// server/multitenant/services/leadService.ts
init_socketEmitter();
init_notificationService();
init_whatsappService();
init_logger();
var leadService = {
  async list(db, tenantId, query) {
    const conditions = ["1=1"];
    const params = [];
    let p = 1;
    if (query.stage) {
      conditions.push(`stage = $${p++}`);
      params.push(query.stage);
    }
    if (query.source) {
      conditions.push(`source = $${p++}`);
      params.push(query.source);
    }
    if (query.assignedTo) {
      conditions.push(`assigned_to = $${p++}`);
      params.push(query.assignedTo);
    }
    if (query.campaignId) {
      conditions.push(`campaign_id = $${p++}`);
      params.push(query.campaignId);
    }
    if (query.search) {
      conditions.push(`(full_name ILIKE $${p} OR phone ILIKE $${p} OR email ILIKE $${p})`);
      params.push(`%${query.search}%`);
      p++;
    }
    if (query.fromDate) {
      conditions.push(`l.created_at >= $${p++}`);
      params.push(query.fromDate);
    }
    if (query.toDate) {
      conditions.push(`l.created_at <= $${p++}`);
      params.push(query.toDate);
    }
    const agingFilter = query.aging;
    if (agingFilter === "fresh") conditions.push(`EXTRACT(EPOCH FROM (now() - COALESCE((SELECT MAX(changed_at) FROM lead_stage_history WHERE lead_id=l.id), l.created_at)))/86400 < 3`);
    if (agingFilter === "aging") conditions.push(`EXTRACT(EPOCH FROM (now() - COALESCE((SELECT MAX(changed_at) FROM lead_stage_history WHERE lead_id=l.id), l.created_at)))/86400 BETWEEN 3 AND 7`);
    if (agingFilter === "stale") conditions.push(`EXTRACT(EPOCH FROM (now() - COALESCE((SELECT MAX(changed_at) FROM lead_stage_history WHERE lead_id=l.id), l.created_at)))/86400 > 7`);
    const where = conditions.join(" AND ");
    const offset = (query.page - 1) * query.limit;
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT l.*, u.full_name AS assigned_to_name, c.name AS course_name,
                ROUND(EXTRACT(EPOCH FROM (now() - COALESCE(
                  (SELECT MAX(changed_at) FROM lead_stage_history WHERE lead_id = l.id),
                  l.created_at
                )))/86400)::int AS days_in_stage
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN courses c ON l.course_id = c.id
         WHERE ${where}
         ORDER BY l.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, query.limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM leads l WHERE ${where}`, params)
    ]);
    return {
      data: rows.rows,
      meta: {
        total: parseInt(count.rows[0].count),
        page: query.page,
        limit: query.limit
      }
    };
  },
  async getById(db, id) {
    const [lead, stageHistory, tasks2, comms, referrer, referrals, interests] = await Promise.all([
      db.query(
        `SELECT l.*, u.full_name AS assigned_to_name, c.name AS course_name, camp.name AS campaign_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN courses c ON l.course_id = c.id
         LEFT JOIN campaigns camp ON l.campaign_id = camp.id
         WHERE l.id = $1`,
        [id]
      ),
      db.query(
        "SELECT * FROM lead_stage_history WHERE lead_id = $1 ORDER BY changed_at DESC",
        [id]
      ),
      db.query(
        "SELECT t.*, u.full_name AS assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.lead_id = $1 ORDER BY t.due_at DESC LIMIT 20",
        [id]
      ),
      db.query(
        "SELECT * FROM communication_logs WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 50",
        [id]
      ),
      // Who referred this lead?
      db.query(
        "SELECT id, full_name, phone, stage FROM leads WHERE id = (SELECT referred_by FROM leads WHERE id = $1)",
        [id]
      ),
      // Leads this person has referred
      db.query(
        "SELECT id, full_name, phone, stage, admitted_at FROM leads WHERE referred_by = $1 ORDER BY created_at DESC LIMIT 10",
        [id]
      ),
      // Multi-course interests
      db.query(
        `SELECT o.*, c.name AS course_name, c.fee AS course_fee
         FROM opportunities o LEFT JOIN courses c ON c.id = o.course_id
         WHERE o.lead_id = $1 ORDER BY o.created_at ASC`,
        [id]
      )
    ]);
    if (!lead.rows[0]) return null;
    return {
      ...lead.rows[0],
      stageHistory: stageHistory.rows,
      tasks: tasks2.rows,
      communications: comms.rows,
      referrer: referrer.rows[0] ?? null,
      referrals: referrals.rows,
      courseInterests: interests.rows
    };
  },
  async create(db, tenantId, data, createdBy) {
    const dupResult = await duplicateDetectionService.check(db, {
      phone: data.phone,
      email: data.email ?? void 0,
      fullName: data.fullName
    });
    const score = leadScoringService.calculateInitial(data);
    const result = await db.query(
      `INSERT INTO leads
         (full_name, email, phone, alternate_phone, city, qualification,
          course_id, source, campaign_id, ad_id, form_id, stage,
          lead_score, assigned_to, is_duplicate, duplicate_of, referred_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new',$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        data.fullName,
        data.email,
        data.phone,
        data.alternatePhone,
        data.city,
        data.qualification,
        data.courseId,
        data.source,
        data.campaignId,
        data.adId,
        data.formId,
        score,
        data.assignedTo,
        dupResult.isDuplicate,
        dupResult.matchedLeadId ?? null,
        data.referredBy ?? null
      ]
    );
    const lead = result.rows[0];
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by) VALUES ($1, 'new', $2)",
      [lead.id, createdBy ?? null]
    );
    await automationService.processEvent(db, tenantId, "lead_created", lead.id, {
      stage: "new",
      source: data.source
    });
    emitToTenant(tenantId, "lead:created", { leadId: lead.id, leadNo: lead.lead_no });
    logger_default.info({ leadId: lead.id, leadNo: lead.lead_no, tenantId }, "Lead created");
    return { lead, duplicate: dupResult };
  },
  async updateStage(db, tenantId, id, toStage, changedBy, note) {
    const prev = await db.query("SELECT stage FROM leads WHERE id = $1", [id]);
    if (!prev.rows[0]) throw Object.assign(new Error("Lead not found"), { status: 404 });
    const fromStage = prev.rows[0].stage;
    if (fromStage === toStage) return prev.rows[0];
    const updates = { stage: toStage, updated_at: /* @__PURE__ */ new Date() };
    if (toStage === "admitted") updates["admitted_at"] = /* @__PURE__ */ new Date();
    await db.query(
      "UPDATE leads SET stage = $1, updated_at = now(), admitted_at = CASE WHEN $1='admitted' THEN now() ELSE admitted_at END WHERE id = $2",
      [toStage, id]
    );
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,$2,$3,$4,$5)",
      [id, fromStage, toStage, changedBy, note ?? null]
    );
    await automationService.processEvent(db, tenantId, "lead_stage_changed", id, {
      fromStage,
      toStage
    });
    if (toStage === "admitted") {
      try {
        const refRow = await db.query(
          `SELECT l2.full_name AS referrer_name, l2.phone AS referrer_phone,
                  l.full_name AS referred_name, l.referred_by
           FROM leads l
           JOIN leads l2 ON l2.id = l.referred_by
           WHERE l.id = $1 AND l.referred_by IS NOT NULL`,
          [id]
        );
        if (refRow.rows[0]) {
          const { referrer_name, referrer_phone, referred_name } = refRow.rows[0];
          const msg = `Hi ${referrer_name}, great news! ${referred_name}, whom you referred, has successfully enrolled. Thank you for spreading the word \u2014 we truly appreciate it!`;
          await whatsappService.sendText(referrer_phone, msg);
          await db.query(
            `INSERT INTO referral_rewards (referrer_id, referred_id, reward_type, status, sent_at)
             SELECT l.referred_by, l.id, 'whatsapp_thankyou', 'sent', now()
             FROM leads l WHERE l.id = $1
             ON CONFLICT (referrer_id, referred_id) DO UPDATE SET status='sent', sent_at=now()`,
            [id]
          );
          logger_default.info({ tenantId, leadId: id }, "Referral thank-you WhatsApp sent");
        }
      } catch (err) {
        logger_default.warn({ tenantId, leadId: id, err }, "Referral thank-you failed");
      }
    }
    emitToTenant(tenantId, "lead:stage_changed", { leadId: id, from: fromStage, to: toStage });
    return { id, fromStage, toStage };
  },
  async assign(db, tenantId, id, toUserId) {
    await db.query(
      "UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id = $2",
      [toUserId, id]
    );
    await automationService.processEvent(db, tenantId, "lead_assigned", id, { toUserId });
    notificationService.notify(
      db,
      tenantId,
      toUserId,
      "lead_assigned",
      "New lead assigned to you",
      { leadId: id }
    ).catch(() => {
    });
    return { id, assignedTo: toUserId };
  },
  async update(db, id, data) {
    const fields = Object.entries(data).filter(([, v]) => v !== void 0).map(([k, _], i) => `${toSnake(k)} = $${i + 2}`).join(", ");
    const values = Object.values(data).filter((v) => v !== void 0);
    await db.query(
      `UPDATE leads SET ${fields}, updated_at = now() WHERE id = $1`,
      [id, ...values]
    );
    return { id };
  }
};
function toSnake(s) {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// shared/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  serial,
  pgEnum,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z as z3 } from "zod";
var userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "counsellor",
  "viewer"
]);
var leadSourceEnum = pgEnum("lead_source", [
  "meta_ads",
  "website",
  "manual",
  "excel_import",
  "walk_in",
  "phone",
  "referral"
]);
var leadStageEnum = pgEnum("lead_stage", [
  "new",
  "contacted",
  "qualified",
  "demo",
  "interested",
  "payment",
  "admitted",
  "lost"
]);
var taskTypeEnum = pgEnum("task_type", [
  "call",
  "whatsapp",
  "email",
  "sms",
  "meeting",
  "demo",
  "follow_up",
  "other"
]);
var taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
  "overdue",
  "cancelled"
]);
var taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);
var channelEnum = pgEnum("channel", [
  "whatsapp",
  "email",
  "sms",
  "ivr",
  "manual_call"
]);
var commDirectionEnum = pgEnum("comm_direction", [
  "outbound",
  "inbound"
]);
var commStatusEnum = pgEnum("comm_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "replied"
]);
var campaignSourceEnum = pgEnum("campaign_source", [
  "meta_ads",
  "google_ads",
  "email",
  "sms",
  "referral",
  "organic",
  "other"
]);
var automationStatusEnum = pgEnum("automation_exec_status", [
  "success",
  "failed",
  "skipped"
]);
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").notNull().default("counsellor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  duration: varchar("duration", { length: 50 }),
  fee: numeric("fee", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  source: campaignSourceEnum("source").notNull(),
  metaCampaignId: varchar("meta_campaign_id", { length: 200 }),
  metaAdsetId: varchar("meta_adset_id", { length: 200 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var campaignStats = pgTable(
  "campaign_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
    date: date("date").notNull(),
    leadsCount: integer("leads_count").notNull().default(0),
    contactedCount: integer("contacted_count").notNull().default(0),
    admittedCount: integer("admitted_count").notNull().default(0),
    spend: numeric("spend", { precision: 12, scale: 2 }),
    costPerLead: numeric("cost_per_lead", { precision: 10, scale: 2 }),
    costPerAdmission: numeric("cost_per_admission", {
      precision: 10,
      scale: 2
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
  },
  (t) => [index("idx_campaign_stats_campaign_date").on(t.campaignId, t.date)]
);
var leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadNo: varchar("lead_no", { length: 30 }).unique(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    email: varchar("email", { length: 150 }),
    phone: varchar("phone", { length: 20 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 20 }),
    city: varchar("city", { length: 100 }),
    qualification: varchar("qualification", { length: 100 }),
    courseId: uuid("course_id").references(() => courses.id),
    source: leadSourceEnum("source").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    adId: varchar("ad_id", { length: 200 }),
    formId: varchar("form_id", { length: 200 }),
    stage: leadStageEnum("stage").notNull().default("new"),
    subStage: varchar("sub_stage", { length: 100 }),
    leadScore: integer("lead_score").notNull().default(0),
    assignedTo: uuid("assigned_to").references(() => users.id),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    duplicateOf: uuid("duplicate_of"),
    lostReason: varchar("lost_reason", { length: 300 }),
    objectionNotes: text("objection_notes"),
    reEngagementEligible: boolean("re_engagement_eligible").notNull().default(true),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    admittedAt: timestamp("admitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
  },
  (t) => [
    index("idx_leads_phone").on(t.phone),
    index("idx_leads_email").on(t.email),
    index("idx_leads_stage").on(t.stage),
    index("idx_leads_assigned_to").on(t.assignedTo),
    index("idx_leads_campaign_id").on(t.campaignId),
    index("idx_leads_source").on(t.source),
    index("idx_leads_created_at").on(t.createdAt)
  ]
);
var leadStageHistory = pgTable("lead_stage_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  fromStage: varchar("from_stage", { length: 50 }),
  toStage: varchar("to_stage", { length: 50 }).notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  note: text("note"),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow()
});
var leadCustomFields = pgTable("lead_custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  fieldValue: text("field_value")
});
var opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  courseId: uuid("course_id").references(() => courses.id),
  stage: varchar("stage", { length: 50 }).notNull().default("new"),
  expectedFee: numeric("expected_fee", { precision: 10, scale: 2 }),
  probability: integer("probability").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    assignedTo: uuid("assigned_to").notNull().references(() => users.id),
    taskType: taskTypeEnum("task_type").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    outcome: text("outcome"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
  },
  (t) => [
    index("idx_tasks_lead_id").on(t.leadId),
    index("idx_tasks_assigned_to").on(t.assignedTo),
    index("idx_tasks_due_at").on(t.dueAt),
    index("idx_tasks_status").on(t.status)
  ]
);
var slaPolicies = pgTable("sla_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  stage: varchar("stage", { length: 50 }).notNull(),
  maxResponseHours: integer("max_response_hours").notNull(),
  escalateTo: uuid("escalate_to").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true)
});
var slaTracking = pgTable("sla_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  taskId: uuid("task_id").references(() => tasks.id),
  policyId: uuid("policy_id").references(() => slaPolicies.id),
  breached: boolean("breached").notNull().default(false),
  breachedAt: timestamp("breached_at", { withTimezone: true }),
  escalationSent: boolean("escalation_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  channel: channelEnum("channel").notNull(),
  triggerEvent: varchar("trigger_event", { length: 100 }),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  variables: jsonb("variables"),
  waTemplateName: varchar("wa_template_name", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var communicationLogs = pgTable(
  "communication_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    taskId: uuid("task_id").references(() => tasks.id),
    channel: channelEnum("channel").notNull(),
    direction: commDirectionEnum("direction").notNull(),
    status: commStatusEnum("status").notNull().default("queued"),
    templateId: uuid("template_id").references(() => messageTemplates.id),
    subject: varchar("subject", { length: 500 }),
    body: text("body").notNull(),
    sentBy: uuid("sent_by").references(() => users.id),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    externalMessageId: varchar("external_message_id", { length: 300 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
  },
  (t) => [
    index("idx_comm_logs_lead_id").on(t.leadId),
    index("idx_comm_logs_channel").on(t.channel),
    index("idx_comm_logs_created_at").on(t.createdAt)
  ]
);
var automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
  triggerConditions: jsonb("trigger_conditions"),
  actions: jsonb("actions").notNull(),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  executionCount: integer("execution_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var automationExecutionLog = pgTable("automation_execution_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").notNull().references(() => automationRules.id),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  actionsTaken: jsonb("actions_taken"),
  status: automationStatusEnum("status").notNull(),
  errorMessage: text("error_message")
});
var reEngagementCampaigns = pgTable("reengagement_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  targetStage: varchar("target_stage", { length: 50 }),
  dormantDays: integer("dormant_days").notNull(),
  channel: channelEnum("channel").notNull(),
  templateId: uuid("template_id").references(() => messageTemplates.id),
  maxAttempts: integer("max_attempts").notNull().default(3),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var reEngagementLog = pgTable("reengagement_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => reEngagementCampaigns.id),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  attemptNumber: integer("attempt_number").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
  responseReceived: boolean("response_received").notNull().default(false)
});
var reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportKey: varchar("report_key", { length: 100 }).unique().notNull(),
  htmlTemplate: text("html_template").notNull(),
  css: text("css"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body"),
    leadId: uuid("lead_id").references(() => leads.id),
    taskId: uuid("task_id").references(() => tasks.id),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
  },
  (t) => [
    index("idx_notifications_user").on(t.userId, t.isRead, t.createdAt)
  ]
);
var pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var leadsRelations = relations(leads, ({ one, many }) => ({
  course: one(courses, { fields: [leads.courseId], references: [courses.id] }),
  campaign: one(campaigns, {
    fields: [leads.campaignId],
    references: [campaigns.id]
  }),
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id]
  }),
  stageHistory: many(leadStageHistory),
  customFields: many(leadCustomFields),
  opportunities: many(opportunities),
  tasks: many(tasks),
  communicationLogs: many(communicationLogs),
  reEngagementLog: many(reEngagementLog)
}));
var tasksRelations = relations(tasks, ({ one }) => ({
  lead: one(leads, { fields: [tasks.leadId], references: [leads.id] }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id]
  })
}));
var insertLeadSchema = createInsertSchema(leads, {
  phone: z3.string().min(10).max(15),
  email: z3.string().email().optional().or(z3.literal("")),
  leadScore: z3.number().min(0).max(100).optional()
}).omit({ id: true, leadNo: true, createdAt: true, updatedAt: true });
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true
});

// server/multitenant/routes/leads.ts
var router2 = Router2();
var guard = [tenantFromHeader, authAndTenantGuard];
router2.get("/export", ...guard, async (req, res) => {
  const { reportService: reportService2 } = await Promise.resolve().then(() => (init_reportService(), reportService_exports));
  const { fromDate, toDate, stage, assignedTo } = req.query;
  const buffer = await reportService2.exportExcel(req.db, "all_leads", { fromDate, toDate, stage, assignedTo });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="leads-export-${Date.now()}.xlsx"`);
  res.send(buffer);
});
router2.get("/import-template", ...guard, (_req, res) => {
  import("exceljs").then(({ default: ExcelJS2 }) => {
    const wb = new ExcelJS2.Workbook();
    const ws = wb.addWorksheet("Leads Import");
    ws.columns = [
      { header: "Full Name *", key: "full_name", width: 22 },
      { header: "Phone *", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 28 },
      { header: "City", key: "city", width: 16 },
      { header: "Qualification", key: "qualification", width: 18 },
      { header: "Course", key: "course", width: 20 },
      { header: "Source", key: "source", width: 16 },
      { header: "Campaign", key: "campaign", width: 20 }
    ];
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    ws.addRow(["John Doe", "9876543210", "john@email.com", "Chennai", "B.Tech", "Full Stack Dev", "walk_in", ""]);
    ws.addRow(["Jane Smith", "8765432109", "", "Bangalore", "B.Sc", "Data Science", "website", ""]);
    wb.xlsx.writeBuffer().then((buf) => {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="leads-import-template.xlsx"');
      res.send(Buffer.from(buf));
    });
  });
});
router2.post("/bulk/assign", ...guard, async (req, res) => {
  const { ids, userId } = req.body;
  if (!Array.isArray(ids) || !ids.length || !userId) {
    res.status(400).json({ ok: false, message: "ids (array) and userId required" });
    return;
  }
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
  await req.db.query(
    `UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id IN (${placeholders})`,
    [userId, ...ids]
  );
  res.json({ ok: true, data: { updated: ids.length } });
});
router2.post("/bulk/stage", ...guard, async (req, res) => {
  const { ids, stage, note } = req.body;
  if (!Array.isArray(ids) || !ids.length || !stage) {
    res.status(400).json({ ok: false, message: "ids (array) and stage required" });
    return;
  }
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
  await req.db.query(
    `UPDATE leads SET stage = $1, updated_at = now() WHERE id IN (${placeholders})`,
    [stage, ...ids]
  );
  for (const id of ids) {
    await req.db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,$3,$4)",
      [id, stage, req.user.sub, note ?? null]
    );
  }
  res.json({ ok: true, data: { updated: ids.length } });
});
router2.get("/", ...guard, async (req, res) => {
  const query = leadQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: query.error.message });
    return;
  }
  const result = await leadService.list(req.db, req.tenantId, query.data);
  res.json({ ok: true, ...result });
});
router2.get("/:id", ...guard, async (req, res) => {
  const lead = await leadService.getById(req.db, req.params["id"]);
  if (!lead) {
    res.status(404).json({ ok: false, code: "NOT_FOUND", message: "Lead not found" });
    return;
  }
  res.json({ ok: true, data: lead });
});
router2.post("/", ...guard, async (req, res) => {
  const parsed2 = insertLeadSchema.safeParse(req.body);
  if (!parsed2.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed2.error.message });
    return;
  }
  const result = await leadService.create(req.db, req.tenantId, parsed2.data, req.user.sub);
  res.status(201).json({ ok: true, data: result });
});
router2.patch("/:id", ...guard, async (req, res) => {
  await leadService.update(req.db, req.params["id"], req.body);
  res.json({ ok: true, data: { id: req.params["id"] } });
});
router2.patch("/:id/stage", ...guard, async (req, res) => {
  const { stage, note } = req.body;
  if (!stage) {
    res.status(400).json({ ok: false, code: "MISSING_STAGE", message: "stage required" });
    return;
  }
  const result = await leadService.updateStage(req.db, req.tenantId, req.params["id"], stage, req.user.sub, note);
  res.json({ ok: true, data: result });
});
router2.patch("/:id/assign", ...guard, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ ok: false, code: "MISSING_USER", message: "userId required" });
    return;
  }
  const result = await leadService.assign(req.db, req.tenantId, req.params["id"], userId);
  res.json({ ok: true, data: result });
});
router2.post("/:id/merge", ...guard, async (req, res) => {
  const { masterId } = req.body;
  if (!masterId) {
    res.status(400).json({ ok: false, code: "MISSING_MASTER", message: "masterId required" });
    return;
  }
  const result = await duplicateDetectionService.merge(req.db, req.params["id"], masterId, req.user.sub);
  res.json({ ok: true, data: result });
});
router2.get("/:id/interests", ...guard, async (req, res) => {
  const rows = await req.db.query(
    `SELECT o.*, c.name AS course_name, c.fee AS course_fee
     FROM opportunities o
     LEFT JOIN courses c ON c.id = o.course_id
     WHERE o.lead_id = $1
     ORDER BY o.created_at ASC`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});
router2.post("/:id/interests", ...guard, async (req, res) => {
  const { course_id, stage = "new", expected_fee, probability = 0 } = req.body;
  if (!course_id) {
    res.status(400).json({ ok: false, message: "course_id required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO opportunities (lead_id, course_id, stage, expected_fee, probability)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [req.params.id, course_id, stage, expected_fee ?? null, probability]
  );
  if (!row.rows.length) {
    res.status(409).json({ ok: false, message: "Already tracking this course" });
    return;
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router2.delete("/:id/interests/:oId", ...guard, async (req, res) => {
  await req.db.query(
    "DELETE FROM opportunities WHERE id=$1 AND lead_id=$2",
    [req.params.oId, req.params.id]
  );
  res.json({ ok: true });
});
router2.get("/:id/referrals", ...guard, async (req, res) => {
  const rows = await req.db.query(
    `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.admitted_at, l.created_at,
            rr.status AS reward_status, rr.sent_at AS reward_sent_at
     FROM leads l
     LEFT JOIN referral_rewards rr ON rr.referred_id = l.id AND rr.referrer_id = $1
     WHERE l.referred_by = $1
     ORDER BY l.created_at DESC`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});
router2.get("/referral-stats", ...guard, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      l.id, l.full_name, l.phone,
      COUNT(r.id)::int                                             AS total_referrals,
      COUNT(r.id) FILTER (WHERE r.stage = 'admitted')::int        AS admitted_referrals,
      COUNT(rr.id) FILTER (WHERE rr.status = 'sent')::int         AS rewards_sent
    FROM leads l
    JOIN leads r ON r.referred_by = l.id
    LEFT JOIN referral_rewards rr ON rr.referrer_id = l.id
    GROUP BY l.id, l.full_name, l.phone
    ORDER BY total_referrals DESC
    LIMIT 20
  `);
  res.json({ ok: true, data: rows.rows });
});
router2.patch("/:id/referred-by", ...guard, async (req, res) => {
  const { referredBy } = req.body;
  await req.db.query(
    "UPDATE leads SET referred_by = $2, updated_at = now() WHERE id = $1",
    [req.params.id, referredBy ?? null]
  );
  res.json({ ok: true });
});
var leads_default = router2;

// server/multitenant/routes/tasks.ts
import { Router as Router3 } from "express";
init_followUpQueue();
var router3 = Router3();
var guard2 = [tenantFromHeader, authAndTenantGuard];
router3.get("/", ...guard2, async (req, res) => {
  const q = taskQuerySchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: q.error.message });
    return;
  }
  const conditions = ["1=1"];
  const params = [];
  let p = 1;
  if (q.data.assignedTo) {
    conditions.push(`t.assigned_to = $${p++}`);
    params.push(q.data.assignedTo);
  }
  if (q.data.status) {
    conditions.push(`t.status = $${p++}`);
    params.push(q.data.status);
  }
  if (q.data.dueToday) {
    conditions.push(`t.due_at::date = CURRENT_DATE`);
  }
  if (q.data.overdue) {
    conditions.push(`t.due_at < now() AND t.status NOT IN ('done','cancelled')`);
  }
  if (req.user.role === "counsellor") {
    conditions.push(`t.assigned_to = $${p++}`);
    params.push(req.user.sub);
  }
  const where = conditions.join(" AND ");
  const offset = (q.data.page - 1) * q.data.limit;
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT t.*,
              l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS assigned_to_name
       FROM tasks t
       JOIN leads l ON t.lead_id = l.id
       JOIN users u ON t.assigned_to = u.id
       WHERE ${where}
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_at ASC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, q.data.limit, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM tasks t WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: q.data.page, limit: q.data.limit } });
});
router3.get("/today-summary", ...guard2, async (req, res) => {
  const userId = req.user.role === "counsellor" ? req.user.sub : null;
  const filter = userId ? "AND t.assigned_to = $1" : "";
  const params = userId ? [userId] : [];
  const result = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND t.due_at::date = CURRENT_DATE) AS due_today,
       COUNT(*) FILTER (WHERE t.status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE t.status = 'done' AND t.completed_at::date = CURRENT_DATE) AS completed_today,
       COUNT(*) FILTER (WHERE t.status = 'pending' AND t.reminder_at <= now()) AS reminders_due
     FROM tasks t
     WHERE 1=1 ${filter}`,
    params
  );
  res.json({ ok: true, data: result.rows[0] });
});
router3.post("/", ...guard2, async (req, res) => {
  const parsed2 = insertTaskSchema.safeParse(req.body);
  if (!parsed2.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed2.error.message });
    return;
  }
  const d = parsed2.data;
  const result = await req.db.query(
    `INSERT INTO tasks (lead_id, opportunity_id, assigned_to, task_type, title, description, status, priority, due_at, reminder_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10) RETURNING *`,
    [d.leadId, d.opportunityId ?? null, d.assignedTo, d.taskType, d.title, d.description ?? null, d.priority, d.dueAt, d.reminderAt ?? null, req.user.sub]
  );
  const task = result.rows[0];
  if (d.reminderAt) {
    const delay = new Date(d.reminderAt).getTime() - Date.now();
    if (delay > 0) {
      await followUpQueue.add("send-reminder", { taskId: task.id, tenantId: req.tenantId }, { delay });
    }
  }
  res.status(201).json({ ok: true, data: task });
});
router3.patch("/:id", ...guard2, async (req, res) => {
  const { status, outcome, priority, dueAt, reminderAt, title, description } = req.body;
  const sets = ["updated_at = now()"];
  const params = [req.params["id"]];
  let p = 2;
  if (status) {
    sets.push(`status = $${p++}`);
    params.push(status);
  }
  if (outcome) {
    sets.push(`outcome = $${p++}`);
    params.push(outcome);
  }
  if (priority) {
    sets.push(`priority = $${p++}`);
    params.push(priority);
  }
  if (dueAt) {
    sets.push(`due_at = $${p++}`);
    params.push(dueAt);
  }
  if (reminderAt) {
    sets.push(`reminder_at = $${p++}`);
    params.push(reminderAt);
  }
  if (title) {
    sets.push(`title = $${p++}`);
    params.push(title);
  }
  if (description) {
    sets.push(`description = $${p++}`);
    params.push(description);
  }
  if (status === "done") {
    sets.push("completed_at = now()");
  }
  const result = await req.db.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1 RETURNING lead_id`,
    params
  );
  if (status === "overdue" && result.rows[0]) {
    await automationService.processEvent(req.db, req.tenantId, "task_overdue", result.rows[0].lead_id, {});
  }
  res.json({ ok: true, data: { id: req.params["id"] } });
});
router3.delete("/:id", ...guard2, async (req, res) => {
  await req.db.query("UPDATE tasks SET status='cancelled', updated_at=now() WHERE id=$1", [req.params["id"]]);
  res.json({ ok: true });
});
var tasks_default = router3;

// server/multitenant/routes/communications.ts
import { Router as Router4 } from "express";
init_communicationService();
var router4 = Router4();
var guard3 = [tenantFromHeader, authAndTenantGuard];
router4.get("/:leadId", ...guard3, async (req, res) => {
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
router4.post("/send", ...guard3, async (req, res) => {
  const parsed2 = sendMessageSchema.safeParse(req.body);
  if (!parsed2.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed2.error.message });
    return;
  }
  const result = await communicationService.send(req.db, req.tenantId, parsed2.data, req.user.sub);
  res.status(201).json({ ok: true, data: result });
});
router4.get("/templates", ...guard3, async (req, res) => {
  const { channel, approvalStatus, all } = req.query;
  const conds = [];
  const params = [];
  let p = 1;
  if (all !== "true") {
    conds.push("is_active = TRUE");
  }
  if (channel) {
    conds.push(`channel = $${p++}`);
    params.push(channel);
  }
  if (approvalStatus) {
    conds.push(`approval_status = $${p++}`);
    params.push(approvalStatus);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const result = await req.db.query(
    `SELECT * FROM message_templates ${where} ORDER BY name`,
    params
  );
  res.json({ ok: true, data: result.rows });
});
router4.post("/templates", ...guard3, async (req, res) => {
  const { name, channel, triggerEvent, subject, body, variables, waTemplateName } = req.body;
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
router4.patch("/templates/:id", ...guard3, async (req, res) => {
  const {
    name,
    subject,
    body,
    isActive,
    waTemplateName,
    approvalStatus,
    metaTemplateId,
    metaTemplateName,
    rejectionReason
  } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (name !== void 0) {
    sets.push(`name = $${p++}`);
    params.push(name);
  }
  if (subject !== void 0) {
    sets.push(`subject = $${p++}`);
    params.push(subject);
  }
  if (body !== void 0) {
    sets.push(`body = $${p++}`);
    params.push(body);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (waTemplateName !== void 0) {
    sets.push(`wa_template_name = $${p++}`);
    params.push(waTemplateName);
  }
  if (approvalStatus !== void 0) {
    sets.push(`approval_status = $${p++}`);
    params.push(approvalStatus);
    if (approvalStatus === "pending") {
      sets.push(`submitted_at = now()`);
    }
    if (approvalStatus === "approved") {
      sets.push(`approved_at = now()`);
    }
  }
  if (metaTemplateId !== void 0) {
    sets.push(`meta_template_id = $${p++}`);
    params.push(metaTemplateId);
  }
  if (metaTemplateName !== void 0) {
    sets.push(`meta_template_name = $${p++}`);
    params.push(metaTemplateName);
  }
  if (rejectionReason !== void 0) {
    sets.push(`rejection_reason = $${p++}`);
    params.push(rejectionReason);
  }
  if (!sets.length) {
    res.status(400).json({ ok: false, message: "Nothing to update" });
    return;
  }
  const row = await req.db.query(
    `UPDATE message_templates SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router4.post("/templates/:id/submit", ...guard3, async (req, res) => {
  const { metaTemplateName } = req.body;
  const row = await req.db.query(
    `UPDATE message_templates
       SET approval_status = 'pending', submitted_at = now(),
           meta_template_name = COALESCE($2, meta_template_name)
     WHERE id = $1 AND channel = 'whatsapp'
     RETURNING *`,
    [req.params.id, metaTemplateName ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Template not found or not a WhatsApp template" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router4.post("/templates/sync-approval", ...guard3, async (req, res) => {
  const updates = req.body;
  if (!Array.isArray(updates)) {
    res.status(400).json({ ok: false, message: "Expected array of template updates" });
    return;
  }
  const results = [];
  for (const u of updates) {
    const dbStatus = u.status === "APPROVED" ? "approved" : u.status === "REJECTED" ? "rejected" : u.status === "PENDING" ? "pending" : u.status === "PAUSED" ? "paused" : "draft";
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
var communications_default = router4;

// server/multitenant/routes/campaigns.ts
import { Router as Router5 } from "express";
var router5 = Router5();
var guard4 = [tenantFromHeader, authAndTenantGuard];
var managerGuard = [...guard4, requireRole("admin", "manager")];
router5.get("/", ...guard4, async (req, res) => {
  const result = await req.db.query(
    `SELECT c.*,
       COALESCE(s.leads_count, 0) AS total_leads,
       COALESCE(s.admitted_count, 0) AS total_admitted,
       COALESCE(s.spend, 0) AS total_spend
     FROM campaigns c
     LEFT JOIN LATERAL (
       SELECT SUM(leads_count) AS leads_count,
              SUM(admitted_count) AS admitted_count,
              SUM(spend) AS spend
       FROM campaign_stats WHERE campaign_id = c.id
     ) s ON TRUE
     ORDER BY c.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});
router5.get("/:id/stats", ...guard4, async (req, res) => {
  const [campaign, dailyStats, stageFunnel] = await Promise.all([
    req.db.query("SELECT * FROM campaigns WHERE id = $1", [req.params["id"]]),
    req.db.query(
      `SELECT date, leads_count, contacted_count, admitted_count, spend, cost_per_lead, cost_per_admission
       FROM campaign_stats WHERE campaign_id = $1 ORDER BY date DESC LIMIT 30`,
      [req.params["id"]]
    ),
    req.db.query(
      `SELECT stage, COUNT(*) AS count
       FROM leads WHERE campaign_id = $1
       GROUP BY stage ORDER BY stage`,
      [req.params["id"]]
    )
  ]);
  if (!campaign.rows[0]) {
    res.status(404).json({ ok: false, code: "NOT_FOUND", message: "Campaign not found" });
    return;
  }
  res.json({ ok: true, data: { campaign: campaign.rows[0], dailyStats: dailyStats.rows, stageFunnel: stageFunnel.rows } });
});
router5.post("/", ...managerGuard, async (req, res) => {
  const { name, source, metaCampaignId, metaAdsetId, startDate, endDate, budget } = req.body;
  if (!name || !source) {
    res.status(400).json({ ok: false, message: "name and source required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO campaigns (name, source, meta_campaign_id, meta_adset_id, start_date, end_date, budget)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, source, metaCampaignId ?? null, metaAdsetId ?? null, startDate ?? null, endDate ?? null, budget ?? null]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});
router5.patch("/:id", ...managerGuard, async (req, res) => {
  const { name, budget, isActive, endDate } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (name !== void 0) {
    sets.push(`name = $${p++}`);
    params.push(name);
  }
  if (budget !== void 0) {
    sets.push(`budget = $${p++}`);
    params.push(budget);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (endDate !== void 0) {
    sets.push(`end_date = $${p++}`);
    params.push(endDate);
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  await req.db.query(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});
var campaigns_default = router5;

// server/multitenant/routes/automation.ts
import { Router as Router6 } from "express";
var router6 = Router6();
var guard5 = [tenantFromHeader, authAndTenantGuard];
var managerGuard2 = [...guard5, requireRole("admin", "manager")];
router6.get("/rules", ...guard5, async (req, res) => {
  const result = await req.db.query(
    `SELECT ar.*, u.full_name AS created_by_name
     FROM automation_rules ar
     LEFT JOIN users u ON ar.created_by = u.id
     ORDER BY ar.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});
router6.post("/rules", ...managerGuard2, async (req, res) => {
  const { name, description, triggerEvent, triggerConditions, actions, delayMinutes } = req.body;
  if (!name || !triggerEvent || !actions?.length) {
    res.status(400).json({ ok: false, message: "name, triggerEvent, actions required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO automation_rules (name, description, trigger_event, trigger_conditions, actions, delay_minutes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      name,
      description ?? null,
      triggerEvent,
      triggerConditions ? JSON.stringify(triggerConditions) : null,
      JSON.stringify(actions),
      delayMinutes ?? 0,
      req.user.sub
    ]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});
router6.patch("/rules/:id", ...managerGuard2, async (req, res) => {
  const { name, description, triggerEvent, isActive, actions, triggerConditions, delayMinutes } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (name !== void 0) {
    sets.push(`name = $${p++}`);
    params.push(name);
  }
  if (description !== void 0) {
    sets.push(`description = $${p++}`);
    params.push(description);
  }
  if (triggerEvent !== void 0) {
    sets.push(`trigger_event = $${p++}`);
    params.push(triggerEvent);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (actions !== void 0) {
    sets.push(`actions = $${p++}`);
    params.push(JSON.stringify(actions));
  }
  if (triggerConditions !== void 0) {
    sets.push(`trigger_conditions = $${p++}`);
    params.push(JSON.stringify(triggerConditions));
  }
  if (delayMinutes !== void 0) {
    sets.push(`delay_minutes = $${p++}`);
    params.push(delayMinutes);
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  await req.db.query(`UPDATE automation_rules SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});
router6.delete("/rules/:id", ...managerGuard2, async (req, res) => {
  await req.db.query("UPDATE automation_rules SET is_active = FALSE WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});
router6.get("/logs", ...guard5, async (req, res) => {
  const { ruleId, leadId } = req.query;
  const conditions = ["1=1"];
  const params = [];
  let p = 1;
  if (ruleId) {
    conditions.push(`ael.rule_id = $${p++}`);
    params.push(ruleId);
  }
  if (leadId) {
    conditions.push(`ael.lead_id = $${p++}`);
    params.push(leadId);
  }
  const result = await req.db.query(
    `SELECT ael.*, ar.name AS rule_name, l.full_name AS lead_name
     FROM automation_execution_log ael
     JOIN automation_rules ar ON ael.rule_id = ar.id
     JOIN leads l ON ael.lead_id = l.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ael.triggered_at DESC LIMIT 100`,
    params
  );
  res.json({ ok: true, data: result.rows });
});
router6.get("/triggers", ...guard5, (_req, res) => {
  res.json({
    ok: true,
    data: [
      { event: "lead_created", label: "New Lead Created" },
      { event: "lead_stage_changed", label: "Lead Stage Changed" },
      { event: "lead_assigned", label: "Lead Assigned to Counsellor" },
      { event: "no_response_24h", label: "No Response after 24 Hours" },
      { event: "no_response_48h", label: "No Response after 48 Hours" },
      { event: "demo_scheduled", label: "Demo Scheduled" },
      { event: "demo_completed", label: "Demo Completed" },
      { event: "payment_link_sent", label: "Payment Link Sent" },
      { event: "payment_pending_24h", label: "Payment Pending for 24 Hours" },
      { event: "task_overdue", label: "Task Overdue" },
      { event: "sla_breach", label: "SLA Breach" }
    ]
  });
});
var automation_default = router6;

// server/multitenant/routes/reports.ts
import { Router as Router7 } from "express";
init_reportService();
var router7 = Router7();
var guard6 = [tenantFromHeader, authAndTenantGuard];
router7.get("/funnel", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const dateFilter = buildDateFilter(fromDate, toDate);
  const result = await req.db.query(
    `SELECT
       stage,
       COUNT(*) AS count,
       ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
     FROM leads
     WHERE 1=1 ${dateFilter.sql}
     GROUP BY stage
     ORDER BY
       CASE stage
         WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3
         WHEN 'demo' THEN 4 WHEN 'interested' THEN 5 WHEN 'payment' THEN 6
         WHEN 'admitted' THEN 7 WHEN 'lost' THEN 8 ELSE 9
       END`,
    dateFilter.params
  );
  const totals = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE stage != 'lost') AS active,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admitted,
       COUNT(*) FILTER (WHERE stage = 'lost') AS lost,
       COUNT(*) AS total
     FROM leads WHERE 1=1 ${dateFilter.sql}`,
    dateFilter.params
  );
  res.json({ ok: true, data: { stages: result.rows, totals: totals.rows[0] } });
});
router7.get("/counsellor", ...guard6, async (req, res) => {
  const { fromDate, toDate, counsellorId } = req.query;
  const dateFilter = buildDateFilter(fromDate, toDate);
  let userFilter = "";
  const params = [...dateFilter.params];
  if (counsellorId) {
    userFilter = `AND l.assigned_to = $${params.length + 1}`;
    params.push(counsellorId);
  }
  const result = await req.db.query(
    `SELECT
       u.id, u.full_name,
       COUNT(DISTINCT l.id) AS total_leads,
       COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'admitted') AS admissions,
       COUNT(DISTINCT t.id) FILTER (WHERE t.task_type = 'call' AND t.status = 'done') AS calls_made,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'overdue') AS overdue_tasks,
       ROUND(AVG(l.lead_score), 1) AS avg_lead_score,
       ROUND(100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'admitted') /
             NULLIF(COUNT(DISTINCT l.id), 0), 1) AS conversion_rate
     FROM users u
     LEFT JOIN leads l ON l.assigned_to = u.id ${dateFilter.sql.replace("WHERE 1=1", "AND 1=1")}
     LEFT JOIN tasks t ON t.lead_id = l.id
     WHERE u.role = 'counsellor' AND u.is_active = TRUE ${userFilter}
     GROUP BY u.id, u.full_name
     ORDER BY admissions DESC`,
    params
  );
  res.json({ ok: true, data: result.rows });
});
router7.get("/campaign-roi", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const dateFilter = buildDateFilter(fromDate, toDate, "c.start_date");
  const result = await req.db.query(
    `SELECT
       c.id, c.name, c.source, c.budget,
       COALESCE(SUM(cs.leads_count), 0) AS total_leads,
       COALESCE(SUM(cs.admitted_count), 0) AS total_admissions,
       COALESCE(SUM(cs.spend), 0) AS total_spend,
       CASE WHEN SUM(cs.leads_count) > 0
         THEN ROUND(SUM(cs.spend) / SUM(cs.leads_count), 2) ELSE 0 END AS cost_per_lead,
       CASE WHEN SUM(cs.admitted_count) > 0
         THEN ROUND(SUM(cs.spend) / SUM(cs.admitted_count), 2) ELSE 0 END AS cost_per_admission,
       ROUND(100.0 * SUM(cs.admitted_count) / NULLIF(SUM(cs.leads_count), 0), 1) AS conversion_rate
     FROM campaigns c
     LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
     WHERE 1=1 ${dateFilter.sql.replace("WHERE 1=1", "AND 1=1")}
     GROUP BY c.id, c.name, c.source, c.budget
     ORDER BY total_admissions DESC`,
    dateFilter.params
  );
  res.json({ ok: true, data: result.rows });
});
router7.get("/conversion", ...guard6, async (req, res) => {
  const { period = "7d" } = req.query;
  const days = period === "90d" ? 90 : period === "30d" ? 30 : 7;
  const result = await req.db.query(
    `SELECT
       DATE_TRUNC('day', created_at)::date AS date,
       COUNT(*) AS leads_created,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admitted
     FROM leads
     WHERE created_at >= now() - ($1 || ' days')::INTERVAL
     GROUP BY 1
     ORDER BY 1`,
    [days]
  );
  const sources = await req.db.query(
    `SELECT source, COUNT(*) AS count
     FROM leads WHERE created_at >= now() - ($1 || ' days')::INTERVAL
     GROUP BY source ORDER BY count DESC`,
    [days]
  );
  res.json({ ok: true, data: { trend: result.rows, sources: sources.rows } });
});
router7.get("/response-time", ...guard6, async (req, res) => {
  const result = await req.db.query(
    `SELECT
       u.full_name AS counsellor,
       COUNT(st.id) AS total_sla_cases,
       COUNT(st.id) FILTER (WHERE st.breached = FALSE) AS within_sla,
       COUNT(st.id) FILTER (WHERE st.breached = TRUE) AS breached,
       ROUND(100.0 * COUNT(st.id) FILTER (WHERE st.breached = FALSE) /
             NULLIF(COUNT(st.id), 0), 1) AS sla_compliance_pct
     FROM users u
     JOIN leads l ON l.assigned_to = u.id
     JOIN sla_tracking st ON st.lead_id = l.id
     WHERE u.role = 'counsellor'
     GROUP BY u.id, u.full_name
     ORDER BY sla_compliance_pct ASC`
  );
  res.json({ ok: true, data: result.rows });
});
router7.get("/revenue", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const df = buildDateFilter(fromDate, toDate, "p.paid_at");
  const [monthly, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         DATE_TRUNC('month', p.paid_at)::date AS month,
         SUM(p.amount) AS revenue,
         COUNT(*) AS payments
       FROM payments p
       WHERE p.status = 'completed' ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    ),
    req.db.query(
      `SELECT
         c.name AS course_name,
         SUM(p.amount) AS revenue,
         COUNT(DISTINCT p.lead_id) AS students,
         COUNT(*) AS payments
       FROM payments p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN courses c ON c.id = l.course_id
       WHERE p.status = 'completed' ${df.sql}
       GROUP BY c.name ORDER BY revenue DESC`,
      df.params
    )
  ]);
  const total = monthly.rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
  res.json({ ok: true, data: { monthly: monthly.rows, byCourse: byCourse.rows, total } });
});
router7.get("/source", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const df = buildDateFilter(fromDate, toDate);
  const result = await req.db.query(
    `SELECT
       COALESCE(source, 'unknown') AS source,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admissions,
       ROUND(100.0 * COUNT(*) FILTER (WHERE stage = 'admitted') / NULLIF(COUNT(*), 0), 1) AS conversion_rate,
       ROUND(AVG(lead_score), 1) AS avg_score
     FROM leads
     WHERE 1=1 ${df.sql}
     GROUP BY source ORDER BY admissions DESC`,
    df.params
  );
  res.json({ ok: true, data: result.rows });
});
router7.get("/nps-trend", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const df = buildDateFilter(fromDate, toDate, "n.responded_at");
  const [trend, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         DATE_TRUNC('month', n.responded_at)::date AS month,
         ROUND(AVG(n.score), 2) AS avg_score,
         COUNT(*) FILTER (WHERE n.category='promoter')  AS promoters,
         COUNT(*) FILTER (WHERE n.category='passive')   AS passives,
         COUNT(*) FILTER (WHERE n.category='detractor') AS detractors,
         COUNT(*) AS responses,
         ROUND(
           (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         ) AS nps_score
       FROM nps_responses n
       WHERE n.responded_at IS NOT NULL ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    ),
    req.db.query(
      `SELECT
         c.name AS course_name,
         ROUND(AVG(n.score), 2) AS avg_score,
         COUNT(*) AS responses,
         ROUND(
           (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         ) AS nps_score
       FROM nps_responses n
       LEFT JOIN courses c ON c.id = n.course_id
       WHERE n.responded_at IS NOT NULL ${df.sql}
       GROUP BY c.name ORDER BY nps_score DESC NULLS LAST`,
      df.params
    )
  ]);
  res.json({ ok: true, data: { trend: trend.rows, byCourse: byCourse.rows } });
});
router7.get("/batch-fill", ...guard6, async (req, res) => {
  const { courseId } = req.query;
  const params = [];
  const cond = courseId ? `AND b.course_id = $${params.push(courseId)}` : "";
  const result = await req.db.query(
    `SELECT
       b.id, b.name AS batch_name, b.capacity, b.start_date, b.end_date,
       b.is_active, b.mode, b.batch_type,
       c.name AS course_name,
       COUNT(e.id) AS enrolled,
       ROUND(100.0 * COUNT(e.id) / NULLIF(b.capacity, 0), 1) AS fill_pct,
       b.capacity - COUNT(e.id) AS seats_left
     FROM batches b
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN enrollments e ON e.batch_id = b.id
     WHERE 1=1 ${cond}
     GROUP BY b.id, b.name, b.capacity, b.start_date, b.end_date, b.is_active, b.mode, b.batch_type, c.name
     ORDER BY b.start_date DESC NULLS LAST, fill_pct DESC`,
    params
  );
  const summary = {
    total: result.rows.length,
    full: result.rows.filter((r) => parseFloat(r.fill_pct) >= 100).length,
    healthy: result.rows.filter((r) => parseFloat(r.fill_pct) >= 70 && parseFloat(r.fill_pct) < 100).length,
    low: result.rows.filter((r) => parseFloat(r.fill_pct) < 70).length,
    avgFill: result.rows.length ? Math.round(result.rows.reduce((s, r) => s + parseFloat(r.fill_pct ?? 0), 0) / result.rows.length) : 0
  };
  res.json({ ok: true, data: result.rows, meta: summary });
});
router7.get("/placement", ...guard6, async (req, res) => {
  const { fromDate, toDate } = req.query;
  const df = buildDateFilter(fromDate, toDate, "p.placed_at");
  const [byCourse, topCompanies, trend] = await Promise.all([
    req.db.query(
      `SELECT
         c.name AS course_name, c.id AS course_id,
         COUNT(DISTINCT e.lead_id) AS total_students,
         COUNT(DISTINCT p.lead_id) AS placed,
         ROUND(100.0 * COUNT(DISTINCT p.lead_id) / NULLIF(COUNT(DISTINCT e.lead_id), 0), 1) AS placement_rate,
         ROUND(AVG(p.package_lpa) FILTER (WHERE p.package_lpa IS NOT NULL), 2) AS avg_package_lpa
       FROM courses c
       LEFT JOIN leads l ON l.course_id = c.id
       LEFT JOIN enrollments e ON e.lead_id = l.id
       LEFT JOIN placements p ON p.lead_id = l.id AND p.verified = TRUE ${df.sql.replace("AND", "AND p.")}
       GROUP BY c.id, c.name ORDER BY placed DESC`,
      df.params
    ),
    req.db.query(
      `SELECT company, COUNT(*) AS placements, ROUND(AVG(package_lpa), 2) AS avg_package_lpa
       FROM placements WHERE verified = TRUE ${df.sql}
       GROUP BY company ORDER BY placements DESC LIMIT 10`,
      df.params
    ),
    req.db.query(
      `SELECT DATE_TRUNC('month', placed_at)::date AS month, COUNT(*) AS placements,
              ROUND(AVG(package_lpa), 2) AS avg_lpa
       FROM placements WHERE verified = TRUE ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    )
  ]);
  res.json({ ok: true, data: { byCourse: byCourse.rows, topCompanies: topCompanies.rows, trend: trend.rows } });
});
router7.post("/export", ...guard6, async (req, res) => {
  const parsed2 = reportExportSchema.safeParse(req.body);
  if (!parsed2.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed2.error.message });
    return;
  }
  const { type, format, fromDate, toDate, counsellorId, campaignId } = parsed2.data;
  if (format === "excel") {
    const buffer = await reportService.exportExcel(req.db, type, { fromDate, toDate, counsellorId, campaignId });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${Date.now()}.xlsx"`);
    res.send(buffer);
  } else {
    const pdf = await reportService.exportPdf(req.db, req.tenantId, type, { fromDate, toDate });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${Date.now()}.pdf"`);
    res.send(pdf);
  }
});
function buildDateFilter(fromDate, toDate, col = "created_at") {
  const params = [];
  const clauses = [];
  if (fromDate) {
    params.push(fromDate);
    clauses.push(`${col} >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    clauses.push(`${col} <= $${params.length}`);
  }
  return { sql: clauses.length ? `AND ${clauses.join(" AND ")}` : "", params };
}
var reports_default = router7;

// server/multitenant/routes/admin.ts
import { Router as Router8 } from "express";
import bcrypt2 from "bcryptjs";
import multer from "multer";

// server/multitenant/services/importService.ts
import * as XLSX from "xlsx";
init_logger();
var COL_MAP = {
  "name": "fullName",
  "full name": "fullName",
  "phone": "phone",
  "mobile": "phone",
  "email": "email",
  "city": "city",
  "qualification": "qualification",
  "course": "courseName",
  "source": "source",
  "campaign": "campaignName"
};
var importService = {
  async importLeadsFromExcel(db, tenantId, buffer, importedBy) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("No worksheet found in file");
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false
    });
    const result = { total: rows.length, imported: 0, duplicates: 0, errors: 0, errorRows: [] };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const normalized = {};
        for (const [key, val] of Object.entries(row)) {
          const mappedKey = COL_MAP[key.toLowerCase().trim()];
          if (mappedKey) normalized[mappedKey] = String(val).trim();
        }
        if (!normalized["fullName"] || !normalized["phone"]) {
          result.errors++;
          result.errorRows.push({ row: rowNum, reason: "Missing name or phone" });
          continue;
        }
        let courseId;
        if (normalized["courseName"]) {
          const c = await db.query("SELECT id FROM courses WHERE name ILIKE $1 LIMIT 1", [normalized["courseName"]]);
          courseId = c.rows[0]?.id;
        }
        let campaignId;
        if (normalized["campaignName"]) {
          const c = await db.query("SELECT id FROM campaigns WHERE name ILIKE $1 LIMIT 1", [normalized["campaignName"]]);
          campaignId = c.rows[0]?.id;
        }
        const source = normalizeSource(normalized["source"]);
        const { lead, duplicate } = await leadService.create(
          db,
          tenantId,
          {
            fullName: normalized["fullName"],
            phone: normalized["phone"],
            email: normalized["email"] || void 0,
            city: normalized["city"] || void 0,
            qualification: normalized["qualification"] || void 0,
            courseId,
            campaignId,
            source
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
        result.errorRows.push({ row: rowNum, reason: err.message });
        logger_default.warn({ row: rowNum, err }, "Import row failed");
      }
    }
    logger_default.info({ tenantId, ...result }, "Lead import complete");
    return result;
  }
};
function normalizeSource(raw) {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("meta") || s.includes("facebook")) return "meta_ads";
  if (s.includes("website") || s.includes("web")) return "website";
  if (s.includes("walk") || s.includes("walkin")) return "walk_in";
  if (s.includes("phone") || s.includes("call")) return "phone";
  if (s.includes("referral") || s.includes("refer")) return "referral";
  return "excel_import";
}

// server/multitenant/routes/admin.ts
init_env();
init_registry();
var router8 = Router8();
var guard7 = [tenantFromHeader, authAndTenantGuard];
var adminGuard = [...guard7, requireRole("admin")];
var upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router8.get("/users", ...adminGuard, async (req, res) => {
  const result = await req.db.query(
    "SELECT id, username, full_name, email, phone, role, is_active, created_at FROM users ORDER BY full_name"
  );
  res.json({ ok: true, data: result.rows });
});
router8.post("/users", ...adminGuard, async (req, res) => {
  const { username, password, fullName, email, phone, role } = req.body;
  if (!username || !password || !fullName) {
    res.status(400).json({ ok: false, message: "username, password, fullName required" });
    return;
  }
  const hash = await bcrypt2.hash(password, 12);
  const result = await req.db.query(
    `INSERT INTO users (username, password_hash, full_name, email, phone, role)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, email, role`,
    [username, hash, fullName, email ?? null, phone ?? null, role ?? "counsellor"]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});
router8.patch("/users/:id", ...adminGuard, async (req, res) => {
  const { fullName, email, phone, role, isActive, password } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (fullName !== void 0) {
    sets.push(`full_name = $${p++}`);
    params.push(fullName);
  }
  if (email !== void 0) {
    sets.push(`email = $${p++}`);
    params.push(email);
  }
  if (phone !== void 0) {
    sets.push(`phone = $${p++}`);
    params.push(phone);
  }
  if (role !== void 0) {
    sets.push(`role = $${p++}`);
    params.push(role);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (password) {
    sets.push(`password_hash = $${p++}`);
    params.push(await bcrypt2.hash(password, 12));
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  await req.db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});
router8.get("/courses/stats", ...guard7, async (req, res) => {
  const r = await req.db.query(`
    SELECT
      COUNT(*)::int                                   AS total_courses,
      COUNT(*) FILTER (WHERE is_active)::int          AS active_courses,
      COALESCE((SELECT COUNT(*) FROM batches), 0)::int AS total_batches,
      COALESCE((SELECT COUNT(*) FROM enrollments), 0)::int AS total_enrollments,
      COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0)::numeric AS total_revenue
    FROM courses
  `);
  res.json({ ok: true, data: r.rows[0] });
});
router8.get("/courses", ...guard7, async (req, res) => {
  const result = await req.db.query(`
    SELECT
      c.*,
      COUNT(DISTINCT b.id)::int  AS batch_count,
      COUNT(DISTINCT e.id)::int  AS enrollment_count,
      COUNT(DISTINCT l.id)::int  AS lead_count
    FROM courses c
    LEFT JOIN batches      b ON b.course_id = c.id
    LEFT JOIN enrollments  e ON e.batch_id  = b.id
    LEFT JOIN leads        l ON l.course_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `);
  res.json({ ok: true, data: result.rows });
});
router8.post("/courses", ...adminGuard, async (req, res) => {
  const { name, description, duration, fee, category, syllabus, certificate_offered, sort_order } = req.body;
  if (!name) {
    res.status(400).json({ ok: false, message: "name required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO courses (name, description, duration, fee, category, syllabus, certificate_offered, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      name,
      description ?? null,
      duration ?? null,
      fee ?? null,
      category ?? null,
      syllabus ?? null,
      certificate_offered ?? true,
      sort_order ?? 0
    ]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});
router8.patch("/courses/:id", ...adminGuard, async (req, res) => {
  const { name, description, duration, fee, isActive, category, syllabus, certificate_offered, sort_order } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (name !== void 0) {
    sets.push(`name = $${p++}`);
    params.push(name);
  }
  if (description !== void 0) {
    sets.push(`description = $${p++}`);
    params.push(description);
  }
  if (duration !== void 0) {
    sets.push(`duration = $${p++}`);
    params.push(duration);
  }
  if (fee !== void 0) {
    sets.push(`fee = $${p++}`);
    params.push(fee);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (category !== void 0) {
    sets.push(`category = $${p++}`);
    params.push(category);
  }
  if (syllabus !== void 0) {
    sets.push(`syllabus = $${p++}`);
    params.push(syllabus);
  }
  if (certificate_offered !== void 0) {
    sets.push(`certificate_offered = $${p++}`);
    params.push(certificate_offered);
  }
  if (sort_order !== void 0) {
    sets.push(`sort_order = $${p++}`);
    params.push(sort_order);
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  const result = await req.db.query(
    `UPDATE courses SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
  res.json({ ok: true, data: result.rows[0] });
});
router8.delete("/courses/:id", ...adminGuard, async (req, res) => {
  const check = await req.db.query(
    `SELECT (SELECT COUNT(*) FROM leads WHERE course_id = $1)::int   AS lead_count,
            (SELECT COUNT(*) FROM batches WHERE course_id = $1)::int AS batch_count`,
    [req.params["id"]]
  );
  const { lead_count, batch_count } = check.rows[0];
  if (lead_count > 0 || batch_count > 0) {
    await req.db.query("UPDATE courses SET is_active = false WHERE id = $1", [req.params["id"]]);
    res.json({ ok: true, archived: true, message: "Course archived (has linked data)" });
    return;
  }
  await req.db.query("DELETE FROM courses WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true, deleted: true });
});
router8.get("/sla-policies", ...adminGuard, async (req, res) => {
  const result = await req.db.query(
    `SELECT sp.*, u.full_name AS escalate_to_name
     FROM sla_policies sp LEFT JOIN users u ON sp.escalate_to = u.id
     ORDER BY sp.stage`
  );
  res.json({ ok: true, data: result.rows });
});
router8.patch("/sla-policies/:id", ...adminGuard, async (req, res) => {
  const { maxResponseHours, escalateTo } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (maxResponseHours !== void 0) {
    sets.push(`max_response_hours = $${p++}`);
    params.push(maxResponseHours);
  }
  if (escalateTo !== void 0) {
    sets.push(`escalate_to = $${p++}`);
    params.push(escalateTo);
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  await req.db.query(`UPDATE sla_policies SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});
router8.get("/settings", ...adminGuard, async (req, res) => {
  const result = await req.db.query("SELECT key, value FROM app_settings ORDER BY key");
  const settings = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  res.json({ ok: true, data: settings });
});
router8.patch("/settings", ...adminGuard, async (req, res) => {
  const entries = Object.entries(req.body);
  for (const [key, value] of entries) {
    await req.db.query(
      "INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()",
      [key, value]
    );
  }
  res.json({ ok: true });
});
router8.post("/import/leads", ...adminGuard, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, message: "No file uploaded" });
    return;
  }
  const result = await importService.importLeadsFromExcel(req.db, req.tenantId, req.file.buffer, req.user.sub);
  res.json({ ok: true, data: result });
});
router8.post("/tenants", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== env.TENANT_ADMIN_KEY) {
    res.status(403).json({ ok: false, message: "Invalid admin key" });
    return;
  }
  const { id, dbUrl, displayName } = req.body;
  if (!id || !dbUrl || !displayName) {
    res.status(400).json({ ok: false, message: "id, dbUrl, displayName required" });
    return;
  }
  registerTenant(id, { dbUrl, displayName });
  await ensureTenantReady(id);
  res.status(201).json({ ok: true, data: { id, displayName } });
});
var admin_default = router8;

// server/multitenant/routes/webhooks.ts
init_env();
import { Router as Router9 } from "express";
import axios6 from "axios";
import crypto2 from "crypto";
init_communicationService();

// server/multitenant/services/razorpayService.ts
init_env();
init_logger();
import axios5 from "axios";
import crypto from "crypto";
var BASE2 = "https://api.razorpay.com/v1";
function authHeader() {
  const cred = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return { Authorization: `Basic ${cred}`, "Content-Type": "application/json" };
}
var razorpayService = {
  isConfigured() {
    return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  },
  /** Create a Razorpay payment link and return the short URL */
  async createPaymentLink(opts) {
    if (!this.isConfigured()) {
      throw new Error("Razorpay credentials not configured");
    }
    const body = {
      amount: Math.round(opts.amount * 100),
      // paise
      currency: "INR",
      accept_partial: false,
      description: opts.description,
      receipt: opts.receiptId,
      customer: {
        name: opts.leadName,
        contact: opts.leadPhone.replace(/\D/g, ""),
        ...opts.leadEmail ? { email: opts.leadEmail } : {}
      },
      notify: { sms: true, email: !!opts.leadEmail, whatsapp: false },
      reminder_enable: true
    };
    if (opts.expireBy) {
      body["expire_by"] = Math.floor(opts.expireBy.getTime() / 1e3);
    }
    const res = await axios5.post(`${BASE2}/payment_links`, body, { headers: authHeader() });
    logger_default.info({ receiptId: opts.receiptId, linkId: res.data.id }, "Razorpay payment link created");
    return { id: res.data.id, short_url: res.data.short_url };
  },
  /** Verify webhook signature from Razorpay */
  verifyWebhookSignature(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
    const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    return signature === expected;
  }
};

// server/multitenant/routes/webhooks.ts
init_dbPool();
init_registry();
init_socketEmitter();
init_logger();

// server/multitenant/lib/metaConsoleStore.ts
import { randomUUID } from "crypto";
var MAX_ENTRIES = 200;
var MetaConsoleStore = class {
  webhookLogs = [];
  sentHistory = [];
  addWebhookLog(entry) {
    const full = {
      id: randomUUID(),
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    };
    this.webhookLogs.unshift(full);
    if (this.webhookLogs.length > MAX_ENTRIES) this.webhookLogs.pop();
    return full;
  }
  getWebhookLogs() {
    return [...this.webhookLogs];
  }
  clearWebhookLogs() {
    this.webhookLogs = [];
  }
  addSentMessage(entry) {
    const full = {
      id: randomUUID(),
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    };
    this.sentHistory.unshift(full);
    if (this.sentHistory.length > MAX_ENTRIES) this.sentHistory.pop();
    return full;
  }
  getSentHistory() {
    return [...this.sentHistory];
  }
  clearSentHistory() {
    this.sentHistory = [];
  }
};
var metaConsoleStore = new MetaConsoleStore();

// server/multitenant/lib/metaWebhookParser.ts
function parseMetaWebhookPayload(body) {
  if (!body || typeof body !== "object") {
    return [fail("root", ["Body is not an object"])];
  }
  const root = body;
  const warnings = [];
  if (root.object !== "whatsapp_business_account") {
    warnings.push(`Unexpected object type: ${String(root.object)}`);
  }
  const entries = Array.isArray(root.entry) ? root.entry : [];
  if (entries.length === 0) {
    return [fail("root", [...warnings, "No entry array found"])];
  }
  const results = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const entryObj = entry;
    const entryId = typeof entryObj.id === "string" ? entryObj.id : void 0;
    const changes = Array.isArray(entryObj.changes) ? entryObj.changes : [];
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const changeObj = change;
      const field = typeof changeObj.field === "string" ? changeObj.field : "unknown";
      const value = changeObj.value;
      if (!value) {
        results.push(fail(field, ["Missing value in change"], entryId));
        continue;
      }
      const meta = value.metadata;
      const parsedMeta = meta ? {
        displayPhone: meta.display_phone_number,
        phoneNumberId: meta.phone_number_id
      } : void 0;
      let foundAny = false;
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        foundAny = true;
        const m = msg;
        const msgType = typeof m.type === "string" ? m.type : void 0;
        let bodyText;
        if (msgType === "text") {
          const t = m.text;
          bodyText = typeof t?.body === "string" ? t.body : void 0;
        } else if (msgType === "interactive") {
          const ia = m.interactive;
          const br = ia?.button_reply;
          const lr = ia?.list_reply;
          bodyText = br?.title ?? lr?.title ?? "[interactive]";
        } else if (msgType === "image") {
          bodyText = "[image]";
        } else if (msgType === "audio") {
          bodyText = "[audio]";
        } else if (msgType === "document") {
          bodyText = "[document]";
        } else if (msgType === "location") {
          bodyText = "[location]";
        } else if (msgType) {
          bodyText = `[${msgType}]`;
        }
        results.push({
          entryId,
          changeField: field,
          eventType: "message_in",
          from: typeof m.from === "string" ? m.from : void 0,
          wamid: typeof m.id === "string" ? m.id : void 0,
          messageType: msgType,
          messageBody: bodyText,
          timestamp: typeof m.timestamp === "string" ? m.timestamp : void 0,
          to: parsedMeta?.phoneNumberId,
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: []
        });
      }
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const stat of statuses) {
        foundAny = true;
        const s = stat;
        results.push({
          entryId,
          changeField: field,
          eventType: "status_update",
          wamid: typeof s.id === "string" ? s.id : void 0,
          statusType: typeof s.status === "string" ? s.status : void 0,
          statusRecipient: typeof s.recipient_id === "string" ? s.recipient_id : void 0,
          timestamp: typeof s.timestamp === "string" ? s.timestamp : void 0,
          from: parsedMeta?.phoneNumberId,
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: []
        });
      }
      if (!foundAny) {
        results.push({
          entryId,
          changeField: field,
          eventType: "unknown",
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: [`Change field "${field}" contained no messages or statuses`]
        });
      }
    }
  }
  if (results.length === 0) {
    return [fail("root", ["No parseable content found"])];
  }
  return results;
}
function fail(field, warnings, entryId) {
  return { entryId, changeField: field, eventType: "unknown", parseSuccess: false, warnings };
}

// server/multitenant/routes/webhooks.ts
var router9 = Router9();
router9.get("/meta", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN) {
    logger_default.info("Meta webhook verified");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ ok: false, message: "Verification failed" });
  }
});
router9.post("/meta", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  if (env.META_APP_SECRET && signature) {
    const rawBody = req.rawBody;
    if (rawBody) {
      const expected = `sha256=${crypto2.createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex")}`;
      if (!crypto2.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(403).json({ ok: false, message: "Invalid signature" });
        return;
      }
    }
  }
  const body = req.body;
  if (body.object !== "page") {
    res.sendStatus(200);
    return;
  }
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== "leadgen") continue;
      const { leadgen_id, form_id, ad_id } = change.value;
      const tenantId = await findTenantByFormId(form_id);
      if (!tenantId) {
        logger_default.warn({ form_id }, "No tenant found for Meta form_id");
        continue;
      }
      try {
        const db = await getPool(tenantId);
        const leadData = await fetchMetaLeadData(leadgen_id);
        const campaign = await db.query(
          "SELECT id FROM campaigns WHERE meta_campaign_id = $1 LIMIT 1",
          [change.value.campaign_id ?? ""]
        );
        await leadService.create(db, tenantId, {
          fullName: leadData.full_name ?? "Unknown",
          phone: leadData.phone_number ?? "",
          email: leadData.email,
          source: "meta_ads",
          adId: ad_id,
          formId: form_id,
          campaignId: campaign.rows[0]?.id ?? void 0
        });
        logger_default.info({ tenantId, leadgen_id }, "Meta lead created");
      } catch (err) {
        logger_default.error({ err, leadgen_id, tenantId }, "Failed to process Meta lead");
      }
    }
  }
  res.sendStatus(200);
});
router9.post("/whatsapp", async (req, res) => {
  const body = req.body;
  if (body.object !== "whatsapp_business_account") {
    res.sendStatus(200);
    return;
  }
  try {
    const parsed2 = parseMetaWebhookPayload(body);
    const first = parsed2.find((e) => e.eventType === "message_in") ?? parsed2.find((e) => e.eventType === "status_update") ?? parsed2[0];
    metaConsoleStore.addWebhookLog({
      source: "real",
      eventType: first?.eventType ?? "unknown",
      from: first?.from ?? first?.statusRecipient,
      messageType: first?.messageType,
      preview: first?.messageBody?.slice(0, 100),
      status: "parsed",
      rawPayload: body,
      parsedEntries: parsed2
    });
  } catch {
  }
  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const val = change.value;
      if (val.statuses) {
        for (const status of val.statuses) {
          const tenantId = await findTenantByPhoneNumberId(entry.id);
          if (!tenantId) continue;
          const db = await getPool(tenantId);
          await communicationService.updateDeliveryStatus(db, tenantId, status.id, status.status);
        }
      }
      if (val.messages) {
        for (const msg of val.messages) {
          const tenantId = await findTenantByPhoneNumberId(entry.id);
          if (!tenantId) continue;
          const db = await getPool(tenantId);
          const lead = await db.query(
            "SELECT id FROM leads WHERE phone LIKE $1 LIMIT 1",
            [`%${msg.from.slice(-10)}`]
          );
          if (!lead.rows[0]) continue;
          await db.query(
            `INSERT INTO communication_logs
               (lead_id, channel, direction, status, body, sent_at, external_message_id)
             VALUES ($1,'whatsapp','inbound','replied',$2,to_timestamp($3),$4)`,
            [lead.rows[0].id, msg.text?.body ?? "", parseInt(msg.timestamp), msg.id]
          );
          await db.query(
            "UPDATE leads SET last_contacted_at = now(), updated_at = now() WHERE id = $1",
            [lead.rows[0].id]
          );
          await db.query(
            `UPDATE reengagement_log SET response_received = TRUE
             WHERE lead_id = $1 AND response_received = FALSE
               AND id = (SELECT id FROM reengagement_log WHERE lead_id = $1 AND response_received = FALSE ORDER BY created_at DESC LIMIT 1)`,
            [lead.rows[0].id]
          );
          const replyText = (msg.text?.body ?? "").trim().toUpperCase();
          if (replyText === "YES" || replyText === "INTERESTED" || replyText === "YES INTERESTED") {
            await handleYesReply(db, tenantId, lead.rows[0].id);
          } else if (replyText === "STOP" || replyText === "UNSUBSCRIBE") {
            await db.query(
              "UPDATE leads SET stage = 'lost', updated_at = now() WHERE id = $1 AND stage = 'new'",
              [lead.rows[0].id]
            );
            await db.query(
              "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'new','lost',NULL,'Replied STOP on WhatsApp')",
              [lead.rows[0].id]
            );
          }
          emitToTenant(tenantId, "message:replied", {
            leadId: lead.rows[0].id,
            messageId: msg.id,
            body: msg.text?.body ?? ""
          });
        }
      }
    }
  }
  res.sendStatus(200);
});
router9.post("/website/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const registry = getRegistry();
  if (!registry.tenants[tenantId]) {
    res.status(404).json({ ok: false });
    return;
  }
  const db = await getPool(tenantId);
  const body = req.body;
  if (!body.phone) {
    res.status(400).json({ ok: false, message: "phone required" });
    return;
  }
  let courseId;
  if (body.course) {
    const c = await db.query("SELECT id FROM courses WHERE name ILIKE $1 LIMIT 1", [body.course]);
    courseId = c.rows[0]?.id;
  }
  await leadService.create(db, tenantId, {
    fullName: body.fullName ?? "Website Lead",
    phone: body.phone,
    email: body.email,
    city: body.city,
    courseId,
    source: "website"
  });
  res.status(201).json({ ok: true });
});
router9.post("/exotel/status", async (req, res) => {
  const { CallSid, Status, To } = req.body;
  logger_default.info({ CallSid, Status, To }, "Exotel call status");
  const commStatus = Status === "completed" ? "delivered" : "failed";
  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    const db = await getPool(tenantId);
    await communicationService.updateDeliveryStatus(db, tenantId, CallSid, commStatus);
  }
  res.sendStatus(200);
});
async function handleYesReply(db, tenantId, leadId) {
  const leadRow = await db.query(
    "SELECT stage, full_name, phone, assigned_to FROM leads WHERE id = $1",
    [leadId]
  );
  const lead = leadRow.rows[0];
  if (!lead) return;
  if (lead.stage === "new") {
    await db.query(
      "UPDATE leads SET stage = 'contacted', updated_at = now() WHERE id = $1",
      [leadId]
    );
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'new','contacted',NULL,'Replied YES on WhatsApp')",
      [leadId]
    );
    emitToTenant(tenantId, "lead:stage_changed", { leadId, from: "new", to: "contacted" });
  }
  let assignTo = lead.assigned_to ?? null;
  if (!assignTo) {
    const fallback = await db.query(
      "SELECT id FROM users WHERE role IN ('admin','manager') AND is_active = TRUE ORDER BY created_at ASC LIMIT 1"
    );
    assignTo = fallback.rows[0]?.id ?? null;
  }
  if (assignTo) {
    const dueAt = new Date(Date.now() + 30 * 60 * 1e3);
    const task = await db.query(
      `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
       VALUES ($1,$2,'call',$3,'pending','urgent',$4) RETURNING id`,
      [leadId, assignTo, `${lead.full_name} replied YES \u2014 call now`, dueAt]
    );
    const { notificationService: notificationService2 } = await Promise.resolve().then(() => (init_notificationService(), notificationService_exports));
    await notificationService2.notify(
      db,
      tenantId,
      assignTo,
      "lead_replied",
      `${lead.full_name} replied YES on WhatsApp \u2014 call now`,
      { leadId, taskId: task.rows[0]?.id }
    );
    emitToTenant(tenantId, "notification", {
      type: "lead_replied",
      message: `${lead.full_name} replied YES on WhatsApp`,
      severity: "success",
      leadId
    });
    const counsellorRow = await db.query(
      "SELECT phone, full_name FROM users WHERE id = $1",
      [assignTo]
    );
    const counsellor = counsellorRow.rows[0];
    if (counsellor?.phone) {
      try {
        const { smsService: smsService2 } = await Promise.resolve().then(() => (init_smsService(), smsService_exports));
        await smsService2.send(
          counsellor.phone,
          `Hi ${counsellor.full_name?.split(" ")[0]}, ${lead.full_name} replied YES on WhatsApp. Call now: ${lead.phone}`
        );
      } catch (err) {
        logger_default.warn({ err, leadId }, "Counsellor SMS alert failed \u2014 continuing");
      }
    }
    logger_default.info({ leadId, assignTo, tenantId }, "YES reply handled \u2014 task + notification sent");
  }
}
async function fetchMetaLeadData(leadgenId) {
  const res = await axios6.get(
    `https://graph.facebook.com/${env.META_API_VERSION}/${leadgenId}`,
    { params: { access_token: env.META_ACCESS_TOKEN, fields: "field_data" } }
  );
  const fields = res.data?.field_data;
  const get = (name) => fields?.find((f) => f.name === name)?.values?.[0] ?? "";
  return {
    full_name: get("full_name"),
    phone_number: get("phone_number"),
    email: get("email")
  };
}
async function findTenantByFormId(formId) {
  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    const db = await getPool(tenantId);
    const res = await db.query(
      "SELECT 1 FROM leads WHERE form_id = $1 LIMIT 1",
      [formId]
    );
    if ((res.rowCount ?? 0) > 0) return tenantId;
  }
  const firstTenant = Object.keys(registry.tenants)[0];
  return firstTenant ?? null;
}
async function findTenantByPhoneNumberId(_phoneNumberId) {
  const registry = getRegistry();
  const firstTenantId = Object.keys(registry.tenants)[0];
  return firstTenantId ?? null;
}
router9.post("/razorpay", async (req, res) => {
  const tenantId = req.query["tenant"] ?? Object.keys(getRegistry().tenants)[0];
  const signature = req.headers["x-razorpay-signature"] ?? "";
  const raw = JSON.stringify(req.body);
  if (env.RAZORPAY_WEBHOOK_SECRET && !razorpayService.verifyWebhookSignature(raw, signature)) {
    logger_default.warn({ tenantId }, "Razorpay webhook signature mismatch");
    res.status(400).json({ ok: false, message: "Invalid signature" });
    return;
  }
  const event = req.body?.event;
  const payload = req.body?.payload;
  logger_default.info({ tenantId, event }, "Razorpay webhook received");
  if (event === "payment_link.paid") {
    const linkId = payload?.payment_link?.entity?.id;
    const amount = (payload?.payment?.entity?.amount ?? 0) / 100;
    const paymentId = payload?.payment?.entity?.id;
    if (linkId) {
      try {
        const db = await getPool(tenantId);
        const row = await db.query(
          "SELECT * FROM payments WHERE receipt_no = $1 AND status = 'pending' LIMIT 1",
          [linkId]
        );
        if (row.rows[0]) {
          await db.query(
            `UPDATE payments SET status='completed', notes='Razorpay payment ID: ' || $2, updated_at=now()
             WHERE id=$1`,
            [row.rows[0].id, paymentId]
          );
          emitToTenant(tenantId, "payment:completed", { paymentId: row.rows[0].id, leadId: row.rows[0].lead_id, amount });
          logger_default.info({ tenantId, linkId, paymentId, amount }, "Razorpay payment marked completed");
        }
      } catch (err) {
        logger_default.error({ tenantId, linkId, err }, "Razorpay webhook DB update failed");
      }
    }
  }
  res.json({ ok: true });
});
var webhooks_default = router9;

// server/multitenant/routes/reengagement.ts
import { Router as Router10 } from "express";
var router10 = Router10();
var guard8 = [tenantFromHeader, authAndTenantGuard];
var managerGuard3 = [...guard8, requireRole("admin", "manager")];
router10.get("/", ...guard8, async (req, res) => {
  const result = await req.db.query(
    `SELECT rc.*,
       mt.name AS template_name,
       (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.campaign_id = rc.id) AS total_sent,
       (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.campaign_id = rc.id AND rl.response_received = TRUE) AS total_responses
     FROM reengagement_campaigns rc
     LEFT JOIN message_templates mt ON rc.template_id = mt.id
     ORDER BY rc.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});
router10.get("/:id/leads", ...guard8, async (req, res) => {
  const campaign = await req.db.query(
    "SELECT * FROM reengagement_campaigns WHERE id = $1",
    [req.params["id"]]
  );
  if (!campaign.rows[0]) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  const c = campaign.rows[0];
  const leads2 = await req.db.query(
    c.target_stage ? `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.last_contacted_at,
           EXTRACT(DAY FROM now() - l.last_contacted_at)::int AS dormant_days,
           (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.lead_id = l.id AND rl.campaign_id = $3) AS attempts
         FROM leads l
         WHERE l.re_engagement_eligible = TRUE
           AND l.stage NOT IN ('admitted','lost')
           AND l.stage = $2
           AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
         ORDER BY l.last_contacted_at ASC NULLS FIRST
         LIMIT 50` : `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.last_contacted_at,
           EXTRACT(DAY FROM now() - l.last_contacted_at)::int AS dormant_days,
           (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.lead_id = l.id AND rl.campaign_id = $2) AS attempts
         FROM leads l
         WHERE l.re_engagement_eligible = TRUE
           AND l.stage NOT IN ('admitted','lost')
           AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
         ORDER BY l.last_contacted_at ASC NULLS FIRST
         LIMIT 50`,
    c.target_stage ? [c.dormant_days, c.target_stage, c.id] : [c.dormant_days, c.id]
  );
  res.json({ ok: true, data: leads2.rows });
});
router10.get("/:id/log", ...guard8, async (req, res) => {
  const result = await req.db.query(
    `SELECT rl.*, l.full_name AS lead_name, l.phone AS lead_phone
     FROM reengagement_log rl
     JOIN leads l ON rl.lead_id = l.id
     WHERE rl.campaign_id = $1
     ORDER BY rl.sent_at DESC LIMIT 100`,
    [req.params["id"]]
  );
  res.json({ ok: true, data: result.rows });
});
router10.post("/", ...managerGuard3, async (req, res) => {
  const { name, description, targetStage, dormantDays, channel, templateId, maxAttempts } = req.body;
  if (!name || !dormantDays || !channel) {
    res.status(400).json({ ok: false, message: "name, dormantDays, channel required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO reengagement_campaigns (name, description, target_stage, dormant_days, channel, template_id, max_attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, description ?? null, targetStage ?? null, dormantDays, channel, templateId ?? null, maxAttempts ?? 3]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});
router10.patch("/:id", ...managerGuard3, async (req, res) => {
  const { name, dormantDays, channel, templateId, maxAttempts, isActive } = req.body;
  const sets = [];
  const params = [req.params["id"]];
  let p = 2;
  if (name !== void 0) {
    sets.push(`name = $${p++}`);
    params.push(name);
  }
  if (dormantDays !== void 0) {
    sets.push(`dormant_days = $${p++}`);
    params.push(dormantDays);
  }
  if (channel !== void 0) {
    sets.push(`channel = $${p++}`);
    params.push(channel);
  }
  if (templateId !== void 0) {
    sets.push(`template_id = $${p++}`);
    params.push(templateId);
  }
  if (maxAttempts !== void 0) {
    sets.push(`max_attempts = $${p++}`);
    params.push(maxAttempts);
  }
  if (isActive !== void 0) {
    sets.push(`is_active = $${p++}`);
    params.push(isActive);
  }
  if (!sets.length) {
    res.json({ ok: true });
    return;
  }
  await req.db.query(`UPDATE reengagement_campaigns SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});
router10.delete("/:id", ...managerGuard3, async (req, res) => {
  await req.db.query("UPDATE reengagement_campaigns SET is_active = FALSE WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});
var reengagement_default = router10;

// server/multitenant/routes/notifications.ts
import { Router as Router11 } from "express";
init_env();
var router11 = Router11();
var guard9 = [tenantFromHeader, authAndTenantGuard];
router11.get("/vapid-key", ...guard9, (_req, res) => {
  if (!env.VAPID_PUBLIC_KEY) {
    res.status(501).json({ ok: false, message: "Push notifications not configured" });
    return;
  }
  res.json({ ok: true, data: { publicKey: env.VAPID_PUBLIC_KEY } });
});
router11.post("/push-subscribe", ...guard9, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ ok: false, message: "Invalid push subscription" });
    return;
  }
  await req.db.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = $3, auth = $4`,
    [req.user.sub, endpoint, keys.p256dh, keys.auth]
  );
  res.json({ ok: true });
});
router11.delete("/push-subscribe", ...guard9, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ ok: false, message: "endpoint required" });
    return;
  }
  await req.db.query(
    "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
    [req.user.sub, endpoint]
  );
  res.json({ ok: true });
});
router11.get("/", ...guard9, async (req, res) => {
  const limit = Math.min(parseInt(req.query["limit"] ?? "30"), 100);
  const result = await req.db.query(
    `SELECT n.*, l.full_name AS lead_name, l.lead_no
     FROM notifications n
     LEFT JOIN leads l ON n.lead_id = l.id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [req.user.sub, limit]
  );
  const unread = await req.db.query(
    "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
    [req.user.sub]
  );
  res.json({ ok: true, data: result.rows, unreadCount: parseInt(unread.rows[0].count) });
});
router11.patch("/read-all", ...guard9, async (req, res) => {
  await req.db.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
    [req.user.sub]
  );
  res.json({ ok: true });
});
router11.patch("/:id/read", ...guard9, async (req, res) => {
  await req.db.query(
    "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
    [req.params["id"], req.user.sub]
  );
  res.json({ ok: true });
});
router11.delete("/", ...guard9, async (req, res) => {
  await req.db.query(
    "DELETE FROM notifications WHERE user_id = $1 AND is_read = TRUE",
    [req.user.sub]
  );
  res.json({ ok: true });
});
var notifications_default = router11;

// server/multitenant/routes/students.ts
import { Router as Router12 } from "express";
var router12 = Router12();
var guard10 = [tenantFromHeader, authAndTenantGuard];
router12.get("/", ...guard10, async (req, res) => {
  const { search, courseId, assignedTo, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg2 - 1) * lm;
  const conditions = ["l.stage = 'admitted'"];
  const params = [];
  let p = 1;
  if (search) {
    conditions.push(`(l.full_name ILIKE $${p} OR l.phone ILIKE $${p} OR l.email ILIKE $${p})`);
    params.push(`%${search}%`);
    p++;
  }
  if (courseId) {
    conditions.push(`l.course_id = $${p++}`);
    params.push(courseId);
  }
  if (assignedTo) {
    conditions.push(`l.assigned_to = $${p++}`);
    params.push(assignedTo);
  }
  const where = conditions.join(" AND ");
  const [rows, countRow] = await Promise.all([
    req.db.query(
      `SELECT
         l.id, l.lead_no, l.full_name, l.phone, l.email, l.city,
         l.qualification, l.stage, l.lead_score, l.admitted_at,
         l.last_contacted_at, l.created_at,
         c.name  AS course_name,
         u.full_name AS counsellor_name,
         u.id AS counsellor_id,
         (SELECT COUNT(*) FROM communication_logs cl WHERE cl.lead_id = l.id) AS total_messages,
         (SELECT COUNT(*) FROM tasks t WHERE t.lead_id = l.id AND t.status = 'done') AS tasks_done,
         (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id) AS last_message_at
       FROM leads l
       LEFT JOIN courses c ON l.course_id = c.id
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE ${where}
       ORDER BY l.admitted_at DESC NULLS LAST, l.updated_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(
      `SELECT COUNT(*) FROM leads l WHERE ${where}`,
      params
    )
  ]);
  const total = parseInt(countRow.rows[0].count);
  res.json({ ok: true, data: rows.rows, meta: { total, page: pg2, limit: lm } });
});
router12.get("/stats", ...guard10, async (req, res) => {
  const now = /* @__PURE__ */ new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [total, thisMonth, byCourse, byCounsellor] = await Promise.all([
    req.db.query("SELECT COUNT(*) FROM leads WHERE stage = 'admitted'"),
    req.db.query("SELECT COUNT(*) FROM leads WHERE stage = 'admitted' AND admitted_at >= $1", [monthStart]),
    req.db.query(
      `SELECT c.name AS course, COUNT(l.id) AS count
       FROM leads l JOIN courses c ON l.course_id = c.id
       WHERE l.stage = 'admitted'
       GROUP BY c.name ORDER BY count DESC LIMIT 8`
    ),
    req.db.query(
      `SELECT u.full_name AS counsellor, COUNT(l.id) AS count
       FROM leads l JOIN users u ON l.assigned_to = u.id
       WHERE l.stage = 'admitted'
       GROUP BY u.full_name ORDER BY count DESC LIMIT 8`
    )
  ]);
  res.json({
    ok: true,
    data: {
      total: parseInt(total.rows[0].count),
      thisMonth: parseInt(thisMonth.rows[0].count),
      byCourse: byCourse.rows,
      byCounsellor: byCounsellor.rows
    }
  });
});
var students_default = router12;

// server/multitenant/routes/pipeline.ts
import { Router as Router13 } from "express";
var router13 = Router13();
var guard11 = [tenantFromHeader, authAndTenantGuard];
router13.get("/insights", ...guard11, async (req, res) => {
  const [paymentPending, interestedCold, stalePipeline, overdueFollowups] = await Promise.all([
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage = 'payment'
    `),
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage = 'interested'
        AND (last_contacted_at IS NULL OR last_contacted_at < now() - interval '24 hours')
    `),
    req.db.query(`
      SELECT COUNT(*) FROM leads
      WHERE stage IN ('contacted','qualified','demo')
        AND updated_at < now() - interval '7 days'
        AND stage NOT IN ('admitted','lost')
    `),
    req.db.query(`
      SELECT COUNT(*) FROM tasks
      WHERE status NOT IN ('done','cancelled')
        AND due_at < now()
    `)
  ]);
  res.json({
    ok: true,
    data: {
      paymentPending: parseInt(paymentPending.rows[0].count),
      interestedCold: parseInt(interestedCold.rows[0].count),
      stalePipeline: parseInt(stalePipeline.rows[0].count),
      overdueFollowups: parseInt(overdueFollowups.rows[0].count)
    }
  });
});
router13.get("/payment-pending", ...guard11, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.city, l.lead_score,
      l.last_contacted_at, l.updated_at,
      EXTRACT(EPOCH FROM (now() - l.updated_at))/3600 AS hours_in_stage,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id,
      (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id) AS last_message_at,
      (SELECT cl.channel FROM communication_logs cl WHERE cl.lead_id = l.id ORDER BY cl.created_at DESC LIMIT 1) AS last_channel
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage = 'payment'
    ORDER BY l.updated_at ASC
    LIMIT 100
  `);
  res.json({ ok: true, data: rows.rows });
});
router13.get("/interested-cold", ...guard11, async (req, res) => {
  const { threshold = "24" } = req.query;
  const hours = Math.max(1, parseInt(threshold));
  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.city, l.lead_score,
      l.last_contacted_at, l.updated_at, l.created_at,
      EXTRACT(EPOCH FROM (now() - COALESCE(l.last_contacted_at, l.created_at)))/3600 AS hours_no_response,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id,
      (SELECT COUNT(*) FROM communication_logs cl WHERE cl.lead_id = l.id AND cl.direction = 'inbound') AS reply_count,
      (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.lead_id = l.id ORDER BY cl.created_at DESC) AS last_message_at
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage = 'interested'
      AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' hours')::interval)
    ORDER BY COALESCE(l.last_contacted_at, l.created_at) ASC
    LIMIT 100
  `, [hours]);
  res.json({ ok: true, data: rows.rows });
});
router13.get("/stale", ...guard11, async (req, res) => {
  const { days = "7" } = req.query;
  const d = Math.max(1, parseInt(days));
  const rows = await req.db.query(`
    SELECT
      l.id, l.lead_no, l.full_name, l.phone, l.email, l.stage, l.lead_score,
      l.last_contacted_at, l.updated_at,
      EXTRACT(EPOCH FROM (now() - l.updated_at))/86400 AS days_stale,
      c.name AS course_name,
      u.full_name AS counsellor_name, u.id AS counsellor_id
    FROM leads l
    LEFT JOIN courses c ON l.course_id = c.id
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.stage IN ('contacted','qualified','demo','interested')
      AND l.updated_at < now() - ($1 || ' days')::interval
    ORDER BY l.updated_at ASC
    LIMIT 100
  `, [d]);
  res.json({ ok: true, data: rows.rows });
});
router13.get("/overdue-tasks", ...guard11, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      t.id, t.title, t.task_type, t.priority, t.due_at, t.status,
      t.lead_id,
      l.full_name AS lead_name, l.phone AS lead_phone, l.stage AS lead_stage, l.lead_no,
      u.full_name AS assigned_to_name,
      EXTRACT(EPOCH FROM (now() - t.due_at))/3600 AS hours_overdue
    FROM tasks t
    JOIN leads l ON t.lead_id = l.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.status NOT IN ('done','cancelled')
      AND t.due_at < now()
    ORDER BY t.due_at ASC
    LIMIT 100
  `);
  res.json({ ok: true, data: rows.rows });
});
var pipeline_default = router13;

// server/multitenant/routes/devTools.ts
init_env();
init_dbPool();
init_registry();
import { Router as Router14 } from "express";
import axios7 from "axios";
init_communicationService();
init_logger();
var router14 = Router14();
async function getDb(req) {
  const tenantId = req.headers["x-tenant"] ?? env.DEMO_TENANT_ID;
  const registry = getRegistry();
  if (!registry.tenants[tenantId]) throw new Error(`Unknown tenant: ${tenantId}`);
  return { db: await getPool(tenantId), tenantId };
}
router14.get("/status", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const [settings, templates, rules, campaigns2] = await Promise.all([
    db.query("SELECT key, value FROM app_settings LIMIT 20"),
    db.query("SELECT id, name, channel FROM message_templates WHERE is_active = TRUE ORDER BY channel, name"),
    db.query("SELECT id, name, trigger_event, is_active, actions FROM automation_rules ORDER BY created_at DESC LIMIT 20"),
    db.query("SELECT id, name, source, is_active FROM campaigns ORDER BY created_at DESC LIMIT 10")
  ]);
  res.json({
    ok: true,
    tenantId,
    channels: {
      whatsapp: !!(env.META_ACCESS_TOKEN && env.META_PHONE_NUMBER_ID),
      email: !!env.SENDGRID_API_KEY,
      sms: !!env.MSG91_AUTH_KEY,
      ivr: !!(env.EXOTEL_API_KEY && env.EXOTEL_SID)
    },
    templates: templates.rows,
    rules: rules.rows,
    campaigns: campaigns2.rows,
    appSettings: Object.fromEntries(settings.rows.map((r) => [r.key, r.value]))
  });
});
router14.post("/seed-test-data", async (req, res) => {
  let _step = "getDb";
  try {
    const { db, tenantId } = await getDb(req);
    _step = "templates";
    const tplSeeds = [
      { name: "Test WhatsApp Welcome", channel: "whatsapp", trigger_event: "lead_created", body: "Hi {{name}}, thanks for your interest in our courses! Our team will contact you shortly. Reply YES to confirm interest." },
      { name: "Test WhatsApp Follow-up", channel: "whatsapp", trigger_event: "no_response_24h", body: "Hi {{name}}, just following up on your enquiry. Are you still interested? Reply INTERESTED to proceed." },
      { name: "Test Email Welcome", channel: "email", trigger_event: "lead_created", subject: "Welcome to Aadhirai Training", body: "Dear {{name}},\n\nThank you for your interest. We will reach out soon.\n\nBest regards,\nAadhirai Team" },
      { name: "Test SMS Alert", channel: "sms", trigger_event: "no_response_48h", body: "Hi {{name}}, this is Aadhirai Training. Reply STOP to opt out." },
      { name: "Test IVR Follow-up", channel: "ivr", trigger_event: "payment_pending_24h", body: "default" }
    ];
    const insertedTemplates = [];
    for (const t of tplSeeds) {
      const exists = await db.query("SELECT id FROM message_templates WHERE name = $1", [t.name]);
      if (!exists.rows[0]) {
        const r = await db.query(
          `INSERT INTO message_templates (name, channel, trigger_event, subject, body, is_active)
           VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id, name, channel`,
          [t.name, t.channel, t.trigger_event, t.subject ?? null, t.body]
        );
        insertedTemplates.push(r.rows[0]);
      } else {
        insertedTemplates.push({ ...exists.rows[0], name: t.name, channel: t.channel, existing: true });
      }
    }
    _step = "automation_rules";
    const [waWelcomeTpl, waFollowTpl, emailTpl, smsTpl] = await Promise.all([
      db.query("SELECT id FROM message_templates WHERE name = 'Test WhatsApp Welcome' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test WhatsApp Follow-up' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test Email Welcome' LIMIT 1"),
      db.query("SELECT id FROM message_templates WHERE name = 'Test SMS Alert' LIMIT 1")
    ]);
    const ruleSeeds = [
      {
        name: "E2E: New Lead \u2014 WhatsApp + Email + Task",
        trigger_event: "lead_created",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "whatsapp", templateId: waWelcomeTpl.rows[0]?.id },
          { type: "send_message", channel: "email", templateId: emailTpl.rows[0]?.id },
          { type: "assign_task", taskType: "call", title: "Initial call to new lead", dueHours: 2, priority: "high" }
        ].filter((a) => a.type !== "send_message" || a.templateId)
      },
      {
        name: "E2E: No Response 24h \u2014 WhatsApp Follow-up",
        trigger_event: "no_response_24h",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "whatsapp", templateId: waFollowTpl.rows[0]?.id }
        ].filter((a) => a.templateId)
      },
      {
        name: "E2E: No Response 48h \u2014 SMS",
        trigger_event: "no_response_48h",
        delay_minutes: 0,
        actions: [
          { type: "send_message", channel: "sms", templateId: smsTpl.rows[0]?.id },
          { type: "assign_task", taskType: "follow_up", title: "Urgent: Lead unresponsive 48h", dueHours: 1, priority: "urgent" }
        ].filter((a) => a.type !== "send_message" || a.templateId)
      },
      {
        name: "E2E: Stage \u2192 Interested \u2014 Schedule Demo",
        trigger_event: "lead_stage_changed",
        trigger_conditions: { toStage: "interested" },
        delay_minutes: 0,
        actions: [
          { type: "assign_task", taskType: "demo", title: "Schedule demo for interested lead", dueHours: 4, priority: "high" }
        ]
      }
    ];
    const insertedRules = [];
    for (const r of ruleSeeds) {
      if (!r.actions.length) {
        insertedRules.push({ name: r.name, skipped: "no valid actions (templates missing?)" });
        continue;
      }
      const exists = await db.query("SELECT id FROM automation_rules WHERE name = $1", [r.name]);
      if (!exists.rows[0]) {
        const inserted = await db.query(
          `INSERT INTO automation_rules (name, trigger_event, trigger_conditions, actions, delay_minutes, is_active, execution_count, created_by)
           VALUES ($1,$2,$3,$4,$5,TRUE,0,(SELECT id FROM users WHERE role='admin' LIMIT 1)) RETURNING id, name`,
          [r.name, r.trigger_event, r.trigger_conditions ? JSON.stringify(r.trigger_conditions) : null, JSON.stringify(r.actions), r.delay_minutes]
        );
        insertedRules.push(inserted.rows[0]);
      } else {
        insertedRules.push({ ...exists.rows[0], name: r.name, existing: true });
      }
    }
    _step = "campaign";
    let campaign = (await db.query("SELECT id, name FROM campaigns WHERE name = 'E2E Test Campaign' LIMIT 1")).rows[0];
    if (!campaign) {
      const r = await db.query(
        `INSERT INTO campaigns (name, source, start_date, end_date, budget, is_active)
         VALUES ('E2E Test Campaign','other', CURRENT_DATE, CURRENT_DATE + interval '30 days', 10000, TRUE)
         RETURNING id, name`
      );
      campaign = r.rows[0];
    }
    res.json({ ok: true, tenantId, insertedTemplates, insertedRules, campaign });
  } catch (err) {
    logger_default.error({ err, _step }, "DEV seed-test-data failed");
    res.status(500).json({ ok: false, message: `Seed failed at step '${_step}': ${err.message}`, detail: err.detail ?? null });
  }
});
router14.post("/create-lead", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const {
    fullName = "Test Student E2E",
    phone = "9" + Math.floor(1e8 + Math.random() * 9e8),
    email = `test.e2e.${Date.now()}@example.com`,
    source = "website",
    campaignId
  } = req.body;
  const admin = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE LIMIT 1");
  const adminId = admin.rows[0]?.id;
  let campId = campaignId;
  if (!campId) {
    const camp = await db.query("SELECT id FROM campaigns WHERE name = 'E2E Test Campaign' LIMIT 1");
    campId = camp.rows[0]?.id ?? null;
  }
  const result = await leadService.create(db, tenantId, {
    fullName,
    phone,
    email,
    source,
    campaignId: campId,
    alternatePhone: null,
    city: "Chennai",
    qualification: "B.Tech",
    courseId: null,
    adId: null,
    formId: null,
    assignedTo: adminId ?? null
  }, adminId);
  logger_default.info({ leadId: result.lead.id, tenantId }, "DEV: test lead created");
  res.json({ ok: true, lead: result.lead, duplicate: result.duplicate });
});
router14.post("/trigger-event", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, event, context = {} } = req.body;
  if (!leadId || !event) {
    res.status(400).json({ ok: false, message: "leadId and event required" });
    return;
  }
  const lead = await db.query("SELECT id, full_name FROM leads WHERE id = $1", [leadId]);
  if (!lead.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  await automationService.processEvent(db, tenantId, event, leadId, context);
  logger_default.info({ leadId, event, tenantId }, "DEV: automation event triggered");
  res.json({ ok: true, message: `Event '${event}' triggered for lead ${lead.rows[0].full_name}` });
});
router14.post("/send-channel", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, channel, templateId, body } = req.body;
  if (!leadId || !channel) {
    res.status(400).json({ ok: false, message: "leadId and channel required" });
    return;
  }
  let msgBody = body;
  if (!msgBody && templateId) {
    const tmpl = await db.query("SELECT body FROM message_templates WHERE id = $1", [templateId]);
    msgBody = tmpl.rows[0]?.body;
  }
  if (!msgBody) {
    res.status(400).json({ ok: false, message: "body or templateId required" });
    return;
  }
  const result = await communicationService.send(db, tenantId, {
    leadId,
    channel,
    templateId,
    body: msgBody
  });
  res.json({ ok: true, logId: result.logId, channel, message: `Queued ${channel} message` });
});
router14.post("/simulate-whatsapp-reply", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, replyText = "YES I am interested" } = req.body;
  if (!leadId) {
    res.status(400).json({ ok: false, message: "leadId required" });
    return;
  }
  const lead = await db.query("SELECT phone, full_name FROM leads WHERE id = $1", [leadId]);
  if (!lead.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  const log = await db.query(
    `INSERT INTO communication_logs (lead_id, channel, direction, status, body, sent_at, created_at)
     VALUES ($1, 'whatsapp', 'inbound', 'delivered', $2, now(), now()) RETURNING id`,
    [leadId, replyText]
  );
  await automationService.processEvent(db, tenantId, "lead_stage_changed", leadId, {
    toStage: "interested",
    fromStage: "contacted",
    replyText
  });
  await db.query(
    "UPDATE leads SET stage = 'interested', updated_at = now() WHERE id = $1",
    [leadId]
  );
  await db.query(
    "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,'contacted','interested',NULL,'Auto: WhatsApp reply received')",
    [leadId]
  );
  logger_default.info({ leadId, replyText, tenantId }, "DEV: WhatsApp reply simulated");
  res.json({ ok: true, logId: log.rows[0].id, leadStageUpdated: "interested", replyText });
});
router14.post("/convert-lead", async (req, res) => {
  const { db, tenantId } = await getDb(req);
  const { leadId, finalStage = "admitted", changedBy } = req.body;
  if (!leadId) {
    res.status(400).json({ ok: false, message: "leadId required" });
    return;
  }
  const admin = changedBy ?? (await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0]?.id;
  const stagesPath = ["contacted", "qualified", "demo", "interested", "payment", finalStage];
  const results = [];
  for (const stage of stagesPath) {
    await db.query(
      "UPDATE leads SET stage = $1, updated_at = now() WHERE id = $2",
      [stage, leadId]
    );
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,$3,'E2E test conversion')",
      [leadId, stage, admin]
    );
    await automationService.processEvent(db, tenantId, "lead_stage_changed", leadId, {
      toStage: stage,
      fromStage: results[results.length - 1] ?? "new"
    });
    results.push(stage);
  }
  if (finalStage === "admitted") {
    await db.query("UPDATE leads SET admitted_at = now() WHERE id = $1", [leadId]);
  }
  res.json({ ok: true, leadId, stagesTraversed: results, finalStage });
});
router14.get("/lead-timeline/:leadId", async (req, res) => {
  const { db } = await getDb(req);
  const { leadId } = req.params;
  const [lead, stages, comms, tasks2, automationLogs] = await Promise.all([
    db.query(`SELECT l.*, u.full_name AS assigned_to_name FROM leads l LEFT JOIN users u ON l.assigned_to=u.id WHERE l.id=$1`, [leadId]),
    db.query("SELECT * FROM lead_stage_history WHERE lead_id=$1 ORDER BY changed_at ASC", [leadId]),
    db.query("SELECT * FROM communication_logs WHERE lead_id=$1 ORDER BY created_at ASC", [leadId]),
    db.query("SELECT t.*, u.full_name AS assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to=u.id WHERE t.lead_id=$1 ORDER BY t.created_at ASC", [leadId]),
    db.query(
      `SELECT ael.*, ar.name AS rule_name FROM automation_execution_log ael
       JOIN automation_rules ar ON ael.rule_id=ar.id
       WHERE ael.lead_id=$1 ORDER BY ael.triggered_at ASC`,
      [leadId]
    )
  ]);
  if (!lead.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  res.json({
    ok: true,
    lead: lead.rows[0],
    timeline: {
      stageHistory: stages.rows,
      communications: comms.rows,
      tasks: tasks2.rows,
      automationRuns: automationLogs.rows
    },
    summary: {
      totalStageChanges: stages.rowCount,
      totalMessages: comms.rowCount,
      totalTasks: tasks2.rowCount,
      automationsFired: automationLogs.rowCount,
      channelsUsed: [...new Set(comms.rows.map((c) => c.channel))]
    }
  });
});
router14.post("/whatsapp-send", async (req, res) => {
  const { to, templateName = "hello_world", languageCode = "en_US" } = req.body;
  if (!to) {
    res.status(400).json({ ok: false, message: "to required" });
    return;
  }
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    res.status(503).json({ ok: false, message: "META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured" });
    return;
  }
  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;
  const metaRes = await axios7.post(url, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: { name: templateName, language: { code: languageCode } }
  }, {
    headers: { Authorization: `Bearer ${env.META_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    validateStatus: () => true
  });
  res.status(metaRes.status).json({ ok: metaRes.status >= 200 && metaRes.status < 300, meta: metaRes.data });
});
var devTools_default = router14;

// server/multitenant/routes/metaConsole.ts
init_env();
import { Router as Router15 } from "express";
import axios8 from "axios";
init_logger();
var router15 = Router15();
function mask(value) {
  if (!value) return void 0;
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
}
function ok(data) {
  return { ok: true, data };
}
router15.get("/status", (_req, res) => {
  const hasAccessToken = !!env.META_ACCESS_TOKEN;
  const hasPhoneNumberId = !!env.META_PHONE_NUMBER_ID;
  const hasAppSecret = !!env.META_APP_SECRET;
  const hasVerifyToken = !!env.META_VERIFY_TOKEN;
  const configured = [hasAccessToken, hasPhoneNumberId, hasAppSecret, hasVerifyToken].filter(Boolean).length;
  const overallStatus = configured === 4 ? "ready" : configured > 0 ? "partial" : "not_configured";
  res.json(ok({
    apiVersion: env.META_API_VERSION,
    environment: env.NODE_ENV,
    webhookEndpoint: "/api/webhooks/meta",
    overallStatus,
    // Binary presence flags (safe to expose)
    hasAccessToken,
    hasPhoneNumberId,
    hasAppSecret,
    hasVerifyToken,
    // Masked values — last 4 chars only
    maskedAccessToken: mask(env.META_ACCESS_TOKEN),
    maskedAppSecret: mask(env.META_APP_SECRET),
    maskedPhoneNumberId: mask(env.META_PHONE_NUMBER_ID),
    maskedVerifyToken: mask(env.META_VERIFY_TOKEN)
  }));
});
router15.post("/webhook/verify-test", (req, res) => {
  const { mode, verifyToken: verifyToken2, challenge } = req.body;
  const modeMatch = mode === "subscribe";
  const tokenMatch = verifyToken2 === env.META_VERIFY_TOKEN;
  const passed = modeMatch && tokenMatch;
  let explanation;
  if (passed) {
    explanation = "Verification passed. Meta would echo back the challenge value with HTTP 200.";
  } else if (!modeMatch) {
    explanation = `Mode mismatch: expected "subscribe", received "${mode ?? "(empty)"}"`;
  } else {
    explanation = "Verify token does not match META_VERIFY_TOKEN in .env. Update the token in your Meta App webhook settings to match.";
  }
  res.json(ok({
    passed,
    httpStatus: passed ? 200 : 403,
    responseBody: passed ? challenge : null,
    explanation,
    checks: { modeMatch, tokenMatch }
  }));
});
router15.post("/messages/send", async (req, res) => {
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    res.status(503).json({
      ok: false,
      message: "META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured in .env"
    });
    return;
  }
  const {
    to,
    type,
    body: textBody,
    templateName,
    languageCode
  } = req.body;
  if (!to || !type) {
    res.status(400).json({ ok: false, message: '"to" and "type" are required' });
    return;
  }
  let requestPayload;
  if (type === "text") {
    if (!textBody) {
      res.status(400).json({ ok: false, message: '"body" is required for text messages' });
      return;
    }
    requestPayload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: textBody }
    };
  } else {
    if (!templateName || !languageCode) {
      res.status(400).json({
        ok: false,
        message: '"templateName" and "languageCode" are required for template messages'
      });
      return;
    }
    requestPayload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: templateName, language: { code: languageCode } }
    };
  }
  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;
  let metaResponse;
  let success = false;
  let messageId;
  let errorMsg;
  try {
    const axiosRes = await axios8.post(url, requestPayload, {
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      validateStatus: () => true
      // always return — don't throw on 4xx/5xx
    });
    metaResponse = axiosRes.data;
    success = axiosRes.status >= 200 && axiosRes.status < 300;
    if (success) {
      const msgs = axiosRes.data?.messages;
      if (Array.isArray(msgs) && typeof msgs[0]?.id === "string") {
        messageId = msgs[0].id;
      }
    } else {
      const errObj = axiosRes.data?.error;
      errorMsg = errObj?.message ?? `HTTP ${axiosRes.status}`;
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Network error";
    metaResponse = { error: errorMsg };
  }
  logger_default.info({ to, type, success, messageId }, "MetaConsole: message send attempt");
  metaConsoleStore.addSentMessage({
    to,
    type,
    preview: type === "text" ? textBody?.slice(0, 80) ?? "" : `template: ${templateName}`,
    success,
    requestPayload,
    metaResponse,
    error: errorMsg
  });
  res.json({
    ok: success,
    data: { success, messageId, metaResponse, requestPayload },
    ...errorMsg && { message: errorMsg }
  });
});
router15.get("/webhook/logs", (_req, res) => {
  res.json(ok(metaConsoleStore.getWebhookLogs()));
});
router15.delete("/webhook/logs", (_req, res) => {
  metaConsoleStore.clearWebhookLogs();
  res.json({ ok: true, message: "Webhook logs cleared" });
});
router15.post("/webhook/simulate", (req, res) => {
  const payload = req.body;
  let parsedEntries = [];
  const errors = [];
  try {
    parsedEntries = parseMetaWebhookPayload(payload);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Unexpected parse error");
  }
  const firstMsg = parsedEntries.find((e) => e.eventType === "message_in");
  const firstStatus = parsedEntries.find((e) => e.eventType === "status_update");
  const primary = firstMsg ?? firstStatus ?? parsedEntries[0];
  const logEntry = metaConsoleStore.addWebhookLog({
    source: "simulated",
    eventType: primary?.eventType ?? "unknown",
    from: primary?.from ?? primary?.statusRecipient,
    messageType: primary?.messageType,
    preview: primary?.messageBody?.slice(0, 100),
    status: errors.length > 0 ? "error" : "parsed",
    rawPayload: payload,
    parsedEntries
  });
  res.json({
    ok: errors.length === 0,
    data: {
      source: "simulated",
      logId: logEntry.id,
      parsedEntries,
      ...errors.length > 0 && { errors }
    }
  });
});
router15.get("/messages/history", (_req, res) => {
  res.json(ok(metaConsoleStore.getSentHistory()));
});
var metaConsole_default = router15;

// server/multitenant/routes/payments.ts
import { Router as Router16 } from "express";
init_whatsappService();
var router16 = Router16();
var guard12 = [tenantFromHeader, authAndTenantGuard];
router16.get("/stats", ...guard12, async (req, res) => {
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
router16.get("/revenue-trend", ...guard12, async (req, res) => {
  const { days = "30" } = req.query;
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
router16.get("/", ...guard12, async (req, res) => {
  const { leadId, method, status, fromDate, toDate, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (leadId) {
    conds.push(`p.lead_id = $${p++}`);
    params.push(leadId);
  }
  if (method) {
    conds.push(`p.method = $${p++}`);
    params.push(method);
  }
  if (status) {
    conds.push(`p.status = $${p++}`);
    params.push(status);
  }
  if (fromDate) {
    conds.push(`p.paid_at >= $${p++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conds.push(`p.paid_at <= $${p++}`);
    params.push(toDate);
  }
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
    req.db.query(`SELECT COUNT(*) FROM payments p WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router16.post("/", ...guard12, async (req, res) => {
  const user = req.user;
  const {
    lead_id,
    plan_id,
    amount,
    method = "cash",
    status = "completed",
    receipt_no,
    installment_no = 1,
    notes,
    paid_at
  } = req.body;
  if (!lead_id || !amount) {
    res.status(400).json({ ok: false, message: "lead_id and amount required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO payments (lead_id, plan_id, amount, method, status, receipt_no, installment_no, notes, paid_at, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, now()),$10)
     RETURNING *`,
    [
      lead_id,
      plan_id ?? null,
      amount,
      method,
      status,
      receipt_no ?? null,
      installment_no,
      notes ?? null,
      paid_at ?? null,
      user.id
    ]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router16.patch("/:id", ...guard12, async (req, res) => {
  const { status, notes, receipt_no } = req.body;
  const autoReceipt = status === "completed" && !receipt_no ? `RCP-${Date.now()}` : receipt_no ?? null;
  const row = await req.db.query(
    `UPDATE payments
     SET status     = COALESCE($2, status),
         notes      = COALESCE($3, notes),
         receipt_no = COALESCE($4, receipt_no),
         paid_at    = CASE WHEN $2 = 'completed' AND paid_at IS NULL THEN now() ELSE paid_at END
     WHERE id = $1 RETURNING *`,
    [req.params.id, status ?? null, notes ?? null, autoReceipt]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  const payment = row.rows[0];
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
        const msg = `\u2705 Payment Received \u2014 Receipt #${payment.receipt_no}
Name: ${full_name}
Amount Paid: \u20B9${parseFloat(payment.amount).toLocaleString("en-IN")}
Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}
` + (balance !== null ? `Balance Due: \u20B9${balance.toLocaleString("en-IN")}
` : "") + `Method: ${payment.method}
Thank you for your payment!`;
        await whatsappService.sendText(phone, msg);
      }
    } catch (_) {
    }
  }
  res.json({ ok: true, data: payment });
});
router16.delete("/:id", ...guard12, async (req, res) => {
  await req.db.query("DELETE FROM payments WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});
router16.get("/by-lead/:leadId", ...guard12, async (req, res) => {
  const { leadId } = req.params;
  const [plan, payments] = await Promise.all([
    req.db.query("SELECT * FROM payment_plans WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1", [leadId]),
    req.db.query(
      `SELECT p.*, u.full_name AS recorded_by_name
       FROM payments p LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.lead_id = $1 ORDER BY p.paid_at DESC`,
      [leadId]
    )
  ]);
  const totalPaid = payments.rows.reduce((s, r) => s + parseFloat(r.amount ?? 0), 0);
  res.json({ ok: true, data: { plan: plan.rows[0] ?? null, payments: payments.rows, totalPaid } });
});
router16.post("/plans", ...guard12, async (req, res) => {
  const {
    lead_id,
    total_fee,
    discount = 0,
    installments = 1,
    notes,
    first_due_date,
    installment_amounts
  } = req.body;
  if (!lead_id || !total_fee) {
    res.status(400).json({ ok: false, message: "lead_id and total_fee required" });
    return;
  }
  let plan;
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
  if (first_due_date && parseInt(String(installments)) > 0) {
    const n = parseInt(String(installments));
    const net = parseFloat(String(total_fee)) - parseFloat(String(discount));
    const customAmts = Array.isArray(installment_amounts) ? installment_amounts : [];
    const perInstallment = net / n;
    await req.db.query("DELETE FROM payment_installments WHERE plan_id = $1", [plan.id]);
    const values = [];
    const params = [];
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
router16.get("/installments", ...guard12, async (req, res) => {
  const { leadId } = req.query;
  if (!leadId) {
    res.status(400).json({ ok: false, message: "leadId required" });
    return;
  }
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
router16.get("/dues", ...guard12, async (req, res) => {
  const { days = "7" } = req.query;
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
    )
  ]);
  const overdueAmt = overdue.rows.reduce((s, r) => s + parseFloat(r.amount), 0);
  const upcomingAmt = upcoming.rows.reduce((s, r) => s + parseFloat(r.amount), 0);
  res.json({
    ok: true,
    data: { overdue: overdue.rows, upcoming: upcoming.rows },
    meta: { overdueAmt, upcomingAmt, overdueCount: overdue.rowCount, upcomingCount: upcoming.rowCount }
  });
});
router16.post("/send-link", ...guard12, async (req, res) => {
  const user = req.user;
  const { lead_id, amount, description, expire_days = 3 } = req.body;
  if (!lead_id || !amount) {
    res.status(400).json({ ok: false, message: "lead_id and amount required" });
    return;
  }
  if (!razorpayService.isConfigured()) {
    res.status(400).json({ ok: false, message: "Razorpay not configured \u2014 add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to env" });
    return;
  }
  const leadRow = await req.db.query(
    "SELECT full_name, phone, email FROM leads WHERE id=$1",
    [lead_id]
  );
  if (!leadRow.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  const lead = leadRow.rows[0];
  const receiptId = `RCP-${Date.now()}`;
  const expireBy = /* @__PURE__ */ new Date();
  expireBy.setDate(expireBy.getDate() + parseInt(String(expire_days)));
  const link = await razorpayService.createPaymentLink({
    amount: parseFloat(String(amount)),
    leadName: lead.full_name,
    leadPhone: lead.phone,
    leadEmail: lead.email ?? void 0,
    description: String(description || `Fee payment for ${lead.full_name}`),
    receiptId,
    expireBy
  });
  const payRow = await req.db.query(
    `INSERT INTO payments (lead_id, amount, method, status, receipt_no, notes, recorded_by)
     VALUES ($1,$2,'online','pending',$3,$4,$5) RETURNING *`,
    [lead_id, amount, link.id, `Razorpay link sent: ${link.short_url}`, user.id]
  );
  const msg = `Hi ${lead.full_name}, please complete your fee payment of \u20B9${parseFloat(String(amount)).toLocaleString("en-IN")} using this secure link: ${link.short_url}
Valid until ${expireBy.toLocaleDateString("en-IN")}.`;
  try {
    await whatsappService.sendText(lead.phone, msg);
  } catch (err) {
  }
  res.status(201).json({ ok: true, data: { payment: payRow.rows[0], link } });
});
router16.patch("/installments/:id", ...guard12, async (req, res) => {
  const { status, paid_at, payment_id, notes } = req.body;
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
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  const inst = row.rows[0];
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
        const msg = `\u2705 Installment ${inst_no}/${total_insts} Received
Name: ${full_name}
Amount: \u20B9${parseFloat(inst.amount).toLocaleString("en-IN")}
Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}
Receipt: ${autoReceiptNo}
` + (balance !== null && parseInt(String(remaining)) > 0 ? `Balance: \u20B9${balance} (${remaining} installment${parseInt(String(remaining)) > 1 ? "s" : ""} remaining)
` : `All installments complete! \u{1F389}
`) + `Thank you for your payment!`;
        await whatsappService.sendText(phone, msg);
      }
    } catch (_) {
    }
  }
  res.json({ ok: true, data: inst });
});
var payments_default = router16;

// server/multitenant/routes/companies.ts
import { Router as Router17 } from "express";
var router17 = Router17();
var guard13 = [tenantFromHeader, authAndTenantGuard];
router17.get("/stats", ...guard13, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      (SELECT COUNT(*) FROM companies) AS total_companies,
      (SELECT COUNT(*) FROM corporate_deals WHERE stage NOT IN ('won','lost')) AS active_deals,
      (SELECT COUNT(*) FROM corporate_deals WHERE stage = 'won') AS won_deals,
      (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals WHERE stage = 'won') AS won_value,
      (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals WHERE stage NOT IN ('won','lost')) AS pipeline_value
  `);
  res.json({ ok: true, data: rows.rows[0] });
});
router17.get("/", ...guard13, async (req, res) => {
  const { search, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const off = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (search) {
    conds.push(`(c.name ILIKE $${p} OR c.contact_person ILIKE $${p} OR c.phone ILIKE $${p})`);
    params.push(`%${search}%`);
    p++;
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT c.*,
              u.full_name AS assigned_to_name,
              (SELECT COUNT(*) FROM corporate_deals d WHERE d.company_id = c.id AND d.stage NOT IN ('won','lost')) AS active_deals,
              (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals d WHERE d.company_id = c.id AND d.stage = 'won') AS won_value
       FROM companies c
       LEFT JOIN users u ON u.id = c.assigned_to
       WHERE ${where}
       ORDER BY c.updated_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM companies c WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router17.post("/", ...guard13, async (req, res) => {
  const user = req.user;
  const { name, industry, contact_person, phone, email, city, website, gst_number, notes, assigned_to } = req.body;
  if (!name) {
    res.status(400).json({ ok: false, message: "name required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO companies (name,industry,contact_person,phone,email,city,website,gst_number,notes,assigned_to,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name, industry ?? null, contact_person ?? null, phone ?? null, email ?? null, city ?? null, website ?? null, gst_number ?? null, notes ?? null, assigned_to ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router17.get("/:id", ...guard13, async (req, res) => {
  const [company, contacts, deals] = await Promise.all([
    req.db.query(
      `SELECT c.*, u.full_name AS assigned_to_name FROM companies c LEFT JOIN users u ON u.id=c.assigned_to WHERE c.id=$1`,
      [req.params.id]
    ),
    req.db.query(
      `SELECT cc.*, l.full_name AS lead_name, l.phone AS lead_phone FROM company_contacts cc LEFT JOIN leads l ON l.id=cc.lead_id WHERE cc.company_id=$1 ORDER BY cc.is_primary DESC`,
      [req.params.id]
    ),
    req.db.query(
      `SELECT d.*, c.name AS course_name, u.full_name AS assigned_to_name FROM corporate_deals d LEFT JOIN courses c ON c.id=d.course_id LEFT JOIN users u ON u.id=d.assigned_to WHERE d.company_id=$1 ORDER BY d.created_at DESC`,
      [req.params.id]
    )
  ]);
  if (!company.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: { ...company.rows[0], contacts: contacts.rows, deals: deals.rows } });
});
router17.patch("/:id", ...guard13, async (req, res) => {
  const f = req.body;
  const row = await req.db.query(
    `UPDATE companies SET
       name=COALESCE($2,name), industry=COALESCE($3,industry), contact_person=COALESCE($4,contact_person),
       phone=COALESCE($5,phone), email=COALESCE($6,email), city=COALESCE($7,city),
       website=COALESCE($8,website), gst_number=COALESCE($9,gst_number),
       notes=COALESCE($10,notes), assigned_to=COALESCE($11,assigned_to), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, f.name ?? null, f.industry ?? null, f.contact_person ?? null, f.phone ?? null, f.email ?? null, f.city ?? null, f.website ?? null, f.gst_number ?? null, f.notes ?? null, f.assigned_to ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router17.post("/:id/contacts", ...guard13, async (req, res) => {
  const { lead_id, role, is_primary = false } = req.body;
  const row = await req.db.query(
    `INSERT INTO company_contacts (company_id,lead_id,role,is_primary) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, lead_id ?? null, role ?? null, is_primary]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router17.delete("/:id/contacts/:contactId", ...guard13, async (req, res) => {
  await req.db.query("DELETE FROM company_contacts WHERE id=$1 AND company_id=$2", [req.params.contactId, req.params.id]);
  res.json({ ok: true });
});
router17.post("/:id/deals", ...guard13, async (req, res) => {
  const user = req.user;
  const { name, course_id, total_value = 0, trainees_count = 0, stage = "prospect", expected_close_date, notes } = req.body;
  if (!name) {
    res.status(400).json({ ok: false, message: "name required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO corporate_deals (company_id,name,course_id,total_value,trainees_count,stage,expected_close_date,notes,assigned_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.params.id, name, course_id ?? null, total_value, trainees_count, stage, expected_close_date ?? null, notes ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router17.patch("/deals/:dealId", ...guard13, async (req, res) => {
  const f = req.body;
  const wonAt = f.stage === "won" ? "now()" : "won_at";
  const row = await req.db.query(
    `UPDATE corporate_deals SET
       name=COALESCE($2,name), stage=COALESCE($3,stage), total_value=COALESCE($4,total_value),
       trainees_count=COALESCE($5,trainees_count), notes=COALESCE($6,notes),
       lost_reason=COALESCE($7,lost_reason), expected_close_date=COALESCE($8,expected_close_date),
       won_at = CASE WHEN $3='won' THEN now() ELSE won_at END,
       updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.dealId, f.name ?? null, f.stage ?? null, f.total_value ?? null, f.trainees_count ?? null, f.notes ?? null, f.lost_reason ?? null, f.expected_close_date ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
var companies_default = router17;

// server/multitenant/routes/batches.ts
import { Router as Router18 } from "express";
init_whatsappService();
init_logger();
var router18 = Router18();
var guard14 = [tenantFromHeader, authAndTenantGuard];
router18.get("/", ...guard14, async (req, res) => {
  const { courseId, isActive, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, parseInt(limit));
  const off = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (courseId) {
    conds.push(`b.course_id = $${p++}`);
    params.push(courseId);
  }
  if (isActive !== void 0) {
    conds.push(`b.is_active = $${p++}`);
    params.push(isActive === "true");
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT b.*, c.name AS course_name,
              (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id) AS enrolled_count,
              b.capacity - (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id) AS seats_left
       FROM batches b
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE ${where}
       ORDER BY b.start_date DESC NULLS LAST, b.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM batches b WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router18.post("/", ...guard14, async (req, res) => {
  const { course_id, name, batch_type = "regular", mode = "offline", timing, start_date, end_date, capacity = 30, notes } = req.body;
  if (!course_id || !name) {
    res.status(400).json({ ok: false, message: "course_id and name required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO batches (course_id,name,batch_type,mode,timing,start_date,end_date,capacity,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [course_id, name, batch_type, mode, timing ?? null, start_date ?? null, end_date ?? null, capacity, notes ?? null]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router18.patch("/:id", ...guard14, async (req, res) => {
  const f = req.body;
  const row = await req.db.query(
    `UPDATE batches SET
       name=COALESCE($2,name), batch_type=COALESCE($3,batch_type), mode=COALESCE($4,mode),
       timing=COALESCE($5,timing), start_date=COALESCE($6,start_date), end_date=COALESCE($7,end_date),
       capacity=COALESCE($8,capacity), is_active=COALESCE($9,is_active), notes=COALESCE($10,notes),
       updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, f.name ?? null, f.batch_type ?? null, f.mode ?? null, f.timing ?? null, f.start_date ?? null, f.end_date ?? null, f.capacity ?? null, f.is_active ?? null, f.notes ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router18.get("/:id/enrollments", ...guard14, async (req, res) => {
  const rows = await req.db.query(
    `SELECT e.*, l.full_name AS student_name, l.phone AS student_phone, l.email AS student_email,
            l.lead_no, l.lead_score
     FROM enrollments e
     JOIN leads l ON l.id = e.lead_id
     WHERE e.batch_id = $1
     ORDER BY e.enrolled_at DESC`,
    [req.params.id]
  );
  const batch = await req.db.query(
    `SELECT b.*, c.name AS course_name FROM batches b LEFT JOIN courses c ON c.id=b.course_id WHERE b.id=$1`,
    [req.params.id]
  );
  res.json({ ok: true, data: { batch: batch.rows[0], enrollments: rows.rows } });
});
router18.post("/:id/enroll", ...guard14, async (req, res) => {
  const { lead_id, fee_amount = 0, notes, waitlist = false } = req.body;
  if (!lead_id) {
    res.status(400).json({ ok: false, message: "lead_id required" });
    return;
  }
  const capacityCheck = await req.db.query(
    `SELECT b.capacity, (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id=b.id) AS enrolled
     FROM batches b WHERE b.id=$1`,
    [req.params.id]
  );
  const batch = capacityCheck.rows[0];
  if (!batch) {
    res.status(404).json({ ok: false, message: "Batch not found" });
    return;
  }
  if (parseInt(batch.enrolled) >= parseInt(batch.capacity)) {
    if (waitlist) {
      const posRow = await req.db.query(
        "SELECT COALESCE(MAX(position),0)+1 AS next_pos FROM batch_waitlist WHERE batch_id=$1",
        [req.params.id]
      );
      const row2 = await req.db.query(
        `INSERT INTO batch_waitlist (batch_id, lead_id, position, notes)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (batch_id, lead_id) DO UPDATE SET notes=EXCLUDED.notes RETURNING *`,
        [req.params.id, lead_id, posRow.rows[0].next_pos, notes ?? null]
      );
      res.status(201).json({ ok: true, waitlisted: true, data: row2.rows[0] });
      return;
    }
    res.status(400).json({ ok: false, message: "Batch is full", canWaitlist: true });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO enrollments (lead_id, batch_id, fee_amount, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (lead_id, batch_id) DO UPDATE SET notes=EXCLUDED.notes RETURNING *`,
    [lead_id, req.params.id, fee_amount, notes ?? null]
  );
  await req.db.query("DELETE FROM batch_waitlist WHERE batch_id=$1 AND lead_id=$2", [req.params.id, lead_id]);
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router18.get("/:id/waitlist", ...guard14, async (req, res) => {
  const rows = await req.db.query(
    `SELECT w.*, l.full_name AS lead_name, l.phone AS lead_phone, l.stage
     FROM batch_waitlist w
     JOIN leads l ON l.id = w.lead_id
     WHERE w.batch_id = $1
     ORDER BY w.position ASC`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});
router18.post("/enrollments/:id/transfer", ...guard14, async (req, res) => {
  const { new_batch_id } = req.body;
  if (!new_batch_id) {
    res.status(400).json({ ok: false, message: "new_batch_id required" });
    return;
  }
  const enrRow = await req.db.query("SELECT * FROM enrollments WHERE id=$1", [req.params.id]);
  if (!enrRow.rows[0]) {
    res.status(404).json({ ok: false, message: "Enrollment not found" });
    return;
  }
  const enr = enrRow.rows[0];
  const capRow = await req.db.query(
    `SELECT b.capacity, (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id=b.id AND e.id != $2) AS enrolled
     FROM batches b WHERE b.id=$1`,
    [new_batch_id, req.params.id]
  );
  if (!capRow.rows[0]) {
    res.status(404).json({ ok: false, message: "Target batch not found" });
    return;
  }
  if (parseInt(capRow.rows[0].enrolled) >= parseInt(capRow.rows[0].capacity)) {
    res.status(400).json({ ok: false, message: "Target batch is full" });
    return;
  }
  const exists = await req.db.query(
    "SELECT id FROM enrollments WHERE lead_id=$1 AND batch_id=$2",
    [enr.lead_id, new_batch_id]
  );
  if (exists.rows.length) {
    res.status(400).json({ ok: false, message: "Student already enrolled in target batch" });
    return;
  }
  const row = await req.db.query(
    "UPDATE enrollments SET batch_id=$2, updated_at=now() WHERE id=$1 RETURNING *",
    [req.params.id, new_batch_id]
  );
  try {
    const nextWaiting = await req.db.query(
      `SELECT w.*, l.full_name, l.phone FROM batch_waitlist w
       JOIN leads l ON l.id = w.lead_id
       WHERE w.batch_id = $1 ORDER BY w.position ASC LIMIT 1`,
      [enr.batch_id]
    );
    if (nextWaiting.rows[0]) {
      const { full_name, phone } = nextWaiting.rows[0];
      await whatsappService.sendText(
        phone,
        `Good news, ${full_name}! A seat has opened up in your waitlisted batch. Please contact us to confirm your enrollment.`
      );
      await req.db.query(
        "UPDATE batch_waitlist SET notified=TRUE WHERE id=$1",
        [nextWaiting.rows[0].id]
      );
    }
  } catch (_) {
  }
  res.json({ ok: true, data: row.rows[0] });
});
router18.patch("/enrollments/:enrollmentId", ...guard14, async (req, res) => {
  const f = req.body;
  const row = await req.db.query(
    `UPDATE enrollments SET
       fee_amount=COALESCE($2,fee_amount), fee_paid=COALESCE($3,fee_paid),
       certificate_issued=COALESCE($4,certificate_issued), completion_date=COALESCE($5,completion_date),
       notes=COALESCE($6,notes)
     WHERE id=$1 RETURNING *`,
    [req.params.enrollmentId, f.fee_amount ?? null, f.fee_paid ?? null, f.certificate_issued ?? null, f.completion_date ?? null, f.notes ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router18.get("/:id/timetable", ...guard14, async (req, res) => {
  const rows = await req.db.query(
    `SELECT bs.*, u.full_name AS trainer_name
     FROM batch_sessions bs
     LEFT JOIN users u ON u.id = bs.trainer_id
     WHERE bs.batch_id = $1
     ORDER BY bs.day_of_week, bs.start_time`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});
router18.post("/:id/timetable", ...guard14, async (req, res) => {
  const { day_of_week, start_time, end_time, topic, trainer_id, location, notes } = req.body;
  if (day_of_week === void 0 || !start_time || !end_time) {
    res.status(400).json({ ok: false, message: "day_of_week, start_time, end_time required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO batch_sessions (batch_id, day_of_week, start_time, end_time, topic, trainer_id, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      req.params.id,
      day_of_week,
      start_time,
      end_time,
      topic ?? null,
      trainer_id ?? null,
      location ?? null,
      notes ?? null
    ]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router18.delete("/timetable/:sessionId", ...guard14, async (req, res) => {
  await req.db.query("DELETE FROM batch_sessions WHERE id=$1", [req.params.sessionId]);
  res.json({ ok: true });
});
router18.post("/enrollments/:enrollmentId/issue-cert", ...guard14, async (req, res) => {
  const user = req.user;
  const seqRow = await req.db.query("SELECT nextval('cert_seq') AS val");
  const certNo = `CERT-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(seqRow.rows[0].val).padStart(6, "0")}`;
  const row = await req.db.query(
    `UPDATE enrollments
       SET certificate_issued = TRUE,
           cert_no            = $2,
           cert_issued_by     = $3,
           cert_issued_at     = now(),
           completion_date    = COALESCE(completion_date, now())
     WHERE id = $1
     RETURNING *`,
    [req.params.enrollmentId, certNo, user.id]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Enrollment not found" });
    return;
  }
  const enr = row.rows[0];
  try {
    const leadRow = await req.db.query(
      `SELECT l.full_name, l.phone, b.name AS batch_name, c.name AS course_name
       FROM leads l
       JOIN enrollments e ON e.lead_id = l.id
       JOIN batches b ON b.id = e.batch_id
       LEFT JOIN courses c ON c.id = b.course_id
       WHERE e.id = $1`,
      [req.params.enrollmentId]
    );
    if (leadRow.rows[0]) {
      const { full_name, phone, batch_name, course_name } = leadRow.rows[0];
      const msg = `\u{1F393} Congratulations, ${full_name}!
Your certificate for *${course_name ?? batch_name}* has been issued.
Certificate No: *${certNo}*
Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")}

We are proud of your achievement. All the best for your future!`;
      await whatsappService.sendText(phone, msg);
    }
  } catch (err) {
    logger_default.warn({ enrollmentId: req.params.enrollmentId, err }, "Certificate WhatsApp failed");
  }
  res.json({ ok: true, data: enr });
});
var batches_default = router18;

// server/multitenant/routes/targets.ts
import { Router as Router19 } from "express";
var router19 = Router19();
var guard15 = [tenantFromHeader, authAndTenantGuard];
router19.get("/leaderboard", ...guard15, async (req, res) => {
  const now = /* @__PURE__ */ new Date();
  const month = parseInt(req.query.month || String(now.getMonth() + 1));
  const year = parseInt(req.query.year || String(now.getFullYear()));
  const rows = await req.db.query(
    `SELECT
       u.id, u.username, u.full_name AS counsellor_name, u.phone,
       COALESCE(ct.revenue_target,   0) AS revenue_target,
       COALESCE(ct.admission_target, 0) AS admission_target,
       -- Actual revenue from payments recorded this month and attributed to leads assigned to this counsellor
       COALESCE((
         SELECT SUM(p.amount) FROM payments p
         JOIN leads l2 ON l2.id = p.lead_id
         WHERE l2.assigned_to = u.id
           AND DATE_TRUNC('month', p.paid_at) = make_date($2,$1,1)
           AND p.status = 'completed'
       ), 0) AS collected,
       -- Admissions this month
       COUNT(DISTINCT l.id) FILTER (
         WHERE l.stage = 'admitted'
           AND DATE_TRUNC('month', l.admitted_at) = make_date($2,$1,1)
       ) AS admissions,
       -- Total assigned leads
       COUNT(DISTINCT l.id) AS total_leads,
       -- Tasks done this month
       COUNT(DISTINCT t.id) FILTER (
         WHERE t.status = 'done'
           AND DATE_TRUNC('month', t.completed_at) = make_date($2,$1,1)
       ) AS tasks_done,
       -- Achievement %
       ROUND(100.0 * COALESCE((
         SELECT SUM(p.amount) FROM payments p
         JOIN leads l2 ON l2.id = p.lead_id
         WHERE l2.assigned_to = u.id
           AND DATE_TRUNC('month', p.paid_at) = make_date($2,$1,1)
           AND p.status = 'completed'
       ), 0) / NULLIF(COALESCE(ct.revenue_target, 0), 0), 1) AS pct
     FROM users u
     LEFT JOIN counsellor_targets ct ON ct.user_id = u.id AND ct.month = $1 AND ct.year = $2
     LEFT JOIN leads l ON l.assigned_to = u.id
     LEFT JOIN tasks t ON t.assigned_to = u.id
     WHERE u.role IN ('counsellor','manager') AND u.is_active = true
     GROUP BY u.id, u.username, u.full_name, u.phone, ct.revenue_target, ct.admission_target
     ORDER BY collected DESC`,
    [month, year]
  );
  res.json({ ok: true, data: rows.rows, meta: { month, year } });
});
router19.get("/my", ...guard15, async (req, res) => {
  const user = req.user;
  const now = /* @__PURE__ */ new Date();
  const month = parseInt(req.query.month || String(now.getMonth() + 1));
  const year = parseInt(req.query.year || String(now.getFullYear()));
  const row = await req.db.query(
    "SELECT * FROM counsellor_targets WHERE user_id=$1 AND month=$2 AND year=$3",
    [user.id, month, year]
  );
  res.json({ ok: true, data: row.rows[0] ?? null });
});
router19.get("/", ...guard15, async (req, res) => {
  const { month, year } = req.query;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (month) {
    conds.push(`ct.month = $${p++}`);
    params.push(parseInt(month));
  }
  if (year) {
    conds.push(`ct.year  = $${p++}`);
    params.push(parseInt(year));
  }
  const rows = await req.db.query(
    `SELECT ct.*, u.full_name FROM counsellor_targets ct
     JOIN users u ON u.id = ct.user_id
     WHERE ${conds.join(" AND ")}
     ORDER BY ct.year DESC, ct.month DESC, u.full_name`,
    params
  );
  res.json({ ok: true, data: rows.rows });
});
router19.post("/", ...guard15, async (req, res) => {
  const { user_id, month, year, revenue_target, admission_target, calls_target } = req.body;
  if (!user_id || !month || !year) {
    res.status(400).json({ ok: false, message: "user_id, month and year required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO counsellor_targets (user_id,month,year,revenue_target,admission_target,calls_target)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id,month,year) DO UPDATE
       SET revenue_target=$4, admission_target=$5, calls_target=$6, updated_at=now()
     RETURNING *`,
    [user_id, month, year, revenue_target ?? 0, admission_target ?? 0, calls_target ?? 0]
  );
  res.json({ ok: true, data: row.rows[0] });
});
router19.delete("/:id", ...guard15, async (req, res) => {
  await req.db.query("DELETE FROM counsellor_targets WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
var targets_default = router19;

// server/multitenant/routes/quotations.ts
import { Router as Router20 } from "express";
var router20 = Router20();
var guard16 = [tenantFromHeader, authAndTenantGuard];
router20.get("/", ...guard16, async (req, res) => {
  const { leadId, companyId, status, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, parseInt(limit));
  const off = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (leadId) {
    conds.push(`q.lead_id    = $${p++}`);
    params.push(leadId);
  }
  if (companyId) {
    conds.push(`q.company_id = $${p++}`);
    params.push(companyId);
  }
  if (status) {
    conds.push(`q.status     = $${p++}`);
    params.push(status);
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT q.*,
              l.full_name AS lead_name,
              co.name AS company_name,
              u.full_name AS created_by_name
       FROM quotations q
       LEFT JOIN leads l ON l.id = q.lead_id
       LEFT JOIN companies co ON co.id = q.company_id
       LEFT JOIN users u ON u.id = q.created_by
       WHERE ${where}
       ORDER BY q.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM quotations q WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router20.post("/", ...guard16, async (req, res) => {
  const user = req.user;
  const { lead_id, company_id, items = [], subtotal = 0, discount = 0, total, valid_until, notes } = req.body;
  const computedTotal = total ?? parseFloat(String(subtotal)) - parseFloat(String(discount));
  const quoteNoRow = await req.db.query("SELECT nextval('quote_no_seq') AS n");
  const quoteNo = `QT-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(quoteNoRow.rows[0].n).padStart(4, "0")}`;
  const row = await req.db.query(
    `INSERT INTO quotations (lead_id,company_id,quote_no,items,subtotal,discount,total,valid_until,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [lead_id ?? null, company_id ?? null, quoteNo, JSON.stringify(items), subtotal, discount, computedTotal, valid_until ?? null, notes ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router20.get("/:id", ...guard16, async (req, res) => {
  const row = await req.db.query(
    `SELECT q.*, l.full_name AS lead_name, l.phone AS lead_phone,
            co.name AS company_name, co.phone AS company_phone,
            u.full_name AS created_by_name
     FROM quotations q
     LEFT JOIN leads l ON l.id = q.lead_id
     LEFT JOIN companies co ON co.id = q.company_id
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = $1`,
    [req.params.id]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router20.patch("/:id", ...guard16, async (req, res) => {
  const f = req.body;
  const row = await req.db.query(
    `UPDATE quotations SET
       items=COALESCE($2::jsonb, items), subtotal=COALESCE($3,subtotal),
       discount=COALESCE($4,discount), total=COALESCE($5,total),
       status=COALESCE($6,status), valid_until=COALESCE($7,valid_until),
       notes=COALESCE($8,notes), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [
      req.params.id,
      f.items ? JSON.stringify(f.items) : null,
      f.subtotal ?? null,
      f.discount ?? null,
      f.total ?? null,
      f.status ?? null,
      f.valid_until ?? null,
      f.notes ?? null
    ]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
var quotations_default = router20;

// server/multitenant/routes/attendance.ts
import { Router as Router21 } from "express";
var router21 = Router21();
var guard17 = [tenantFromHeader, authAndTenantGuard];
router21.get("/:enrollmentId", ...guard17, async (req, res) => {
  const rows = await req.db.query(
    "SELECT * FROM attendance WHERE enrollment_id = $1 ORDER BY date DESC",
    [req.params.enrollmentId]
  );
  const summary = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status='present') AS present,
       COUNT(*) FILTER (WHERE status='absent')  AS absent,
       COUNT(*) FILTER (WHERE status='late')    AS late,
       COUNT(*) FILTER (WHERE status='excused') AS excused,
       COUNT(*)                                  AS total
     FROM attendance WHERE enrollment_id = $1`,
    [req.params.enrollmentId]
  );
  res.json({ ok: true, data: { records: rows.rows, summary: summary.rows[0] } });
});
router21.post("/", ...guard17, async (req, res) => {
  const { enrollment_id, date: date2, status = "present", notes, batch_id, records } = req.body;
  if (batch_id && Array.isArray(records) && date2) {
    const values = [];
    const params = [];
    let p = 1;
    for (const r of records) {
      values.push(`($${p++},$${p++},$${p++},$${p++})`);
      params.push(r.enrollment_id, date2, r.status ?? "present", r.notes ?? null);
    }
    if (values.length) {
      await req.db.query(
        `INSERT INTO attendance (enrollment_id, date, status, notes) VALUES ${values.join(",")}
         ON CONFLICT (enrollment_id, date) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes`,
        params
      );
    }
    res.json({ ok: true, data: { marked: values.length } });
    return;
  }
  if (!enrollment_id || !date2) {
    res.status(400).json({ ok: false, message: "enrollment_id and date required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO attendance (enrollment_id, date, status, notes) VALUES ($1,$2,$3,$4)
     ON CONFLICT (enrollment_id, date) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes
     RETURNING *`,
    [enrollment_id, date2, status, notes ?? null]
  );
  res.json({ ok: true, data: row.rows[0] });
});
router21.get("/batch/:batchId/summary", ...guard17, async (req, res) => {
  const { date: date2 } = req.query;
  const targetDate = date2 ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const rows = await req.db.query(
    `SELECT e.id AS enrollment_id, l.full_name AS student_name, l.phone AS student_phone,
            a.status, a.notes
     FROM enrollments e
     JOIN leads l ON l.id = e.lead_id
     LEFT JOIN attendance a ON a.enrollment_id = e.id AND a.date = $2
     WHERE e.batch_id = $1
     ORDER BY l.full_name`,
    [req.params.batchId, targetDate]
  );
  const totalPresent = rows.rows.filter((r) => r.status === "present").length;
  const totalAbsent = rows.rows.filter((r) => r.status === "absent").length;
  const totalMarked = rows.rows.filter((r) => r.status !== null).length;
  res.json({
    ok: true,
    data: {
      date: targetDate,
      roll: rows.rows,
      summary: { total: rows.rows.length, present: totalPresent, absent: totalAbsent, marked: totalMarked }
    }
  });
});
router21.get("/certificates/list", ...guard17, async (req, res) => {
  const { batchId, leadId } = req.query;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (batchId) {
    conds.push(`c.enrollment_id IN (SELECT id FROM enrollments WHERE batch_id=$${p++})`);
    params.push(batchId);
  }
  if (leadId) {
    conds.push(`c.lead_id = $${p++}`);
    params.push(leadId);
  }
  const rows = await req.db.query(
    `SELECT c.*, l.full_name AS student_name, l.phone AS student_phone
     FROM certificates c JOIN leads l ON l.id = c.lead_id
     WHERE ${conds.join(" AND ")}
     ORDER BY c.issued_at DESC`,
    params
  );
  res.json({ ok: true, data: rows.rows });
});
router21.post("/certificates", ...guard17, async (req, res) => {
  const { lead_id, enrollment_id, course_name, issued_at, dispatch_mode = "email", notes } = req.body;
  if (!lead_id || !course_name) {
    res.status(400).json({ ok: false, message: "lead_id and course_name required" });
    return;
  }
  const certNoRow = await req.db.query("SELECT nextval('cert_no_seq') AS n");
  const certNo = `CERT-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(certNoRow.rows[0].n).padStart(4, "0")}`;
  const row = await req.db.query(
    `INSERT INTO certificates (lead_id, enrollment_id, cert_no, course_name, issued_at, dispatch_mode, notes)
     VALUES ($1,$2,$3,$4,COALESCE($5::date, CURRENT_DATE),$6,$7) RETURNING *`,
    [lead_id, enrollment_id ?? null, certNo, course_name, issued_at ?? null, dispatch_mode, notes ?? null]
  );
  if (enrollment_id) {
    await req.db.query("UPDATE enrollments SET certificate_issued=true WHERE id=$1", [enrollment_id]);
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router21.patch("/certificates/:id/dispatch", ...guard17, async (req, res) => {
  const { dispatch_mode } = req.body;
  const row = await req.db.query(
    `UPDATE certificates SET dispatched_at=now(), dispatch_mode=COALESCE($2,dispatch_mode) WHERE id=$1 RETURNING *`,
    [req.params.id, dispatch_mode ?? null]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
var attendance_default = router21;

// server/multitenant/routes/demos.ts
import { Router as Router22 } from "express";
init_followUpQueue();
var router22 = Router22();
var guard18 = [tenantFromHeader, authAndTenantGuard];
router22.get("/", ...guard18, async (req, res) => {
  const { leadId, status, upcoming } = req.query;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (leadId) {
    conds.push(`ds.lead_id = $${p++}`);
    params.push(leadId);
  }
  if (status) {
    conds.push(`ds.status = $${p++}`);
    params.push(status);
  }
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
router22.get("/stats", ...guard18, async (req, res) => {
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
router22.post("/", ...guard18, async (req, res) => {
  const user = req.user;
  const {
    lead_id,
    batch_id,
    scheduled_at,
    duration_min = 60,
    mode = "offline",
    location,
    counsellor_id,
    trainer_id,
    notes
  } = req.body;
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
    [
      lead_id,
      batch_id ?? null,
      scheduled_at,
      duration_min,
      mode,
      location ?? null,
      counsellor_id ?? null,
      trainer_id ?? null,
      notes ?? null,
      user.id
    ]
  );
  const demo = row.rows[0];
  const leadRow = await req.db.query(
    "SELECT full_name, phone FROM leads WHERE id = $1",
    [lead_id]
  );
  const lead = leadRow.rows[0];
  const demoTime = new Date(String(scheduled_at)).getTime();
  const now = Date.now();
  const jobBase = {
    demoId: demo.id,
    leadId: lead_id,
    leadName: lead?.full_name,
    leadPhone: lead?.phone,
    tenantId: req.tenantId,
    scheduledAt: scheduled_at,
    mode,
    location: location ?? null
  };
  let job24Id;
  let job1Id;
  const delay24 = demoTime - now - 24 * 3600 * 1e3;
  if (delay24 > 0) {
    const j = await followUpQueue.add("demo-reminder", jobBase, { delay: delay24 });
    job24Id = j?.id ?? void 0;
  }
  const delay1 = demoTime - now - 1 * 3600 * 1e3;
  if (delay1 > 0) {
    const j = await followUpQueue.add("demo-reminder", jobBase, { delay: delay1 });
    job1Id = j?.id ?? void 0;
  }
  if (job24Id || job1Id) {
    await req.db.query(
      "UPDATE demo_sessions SET reminder_24h_job=$2, reminder_1h_job=$3 WHERE id=$1",
      [demo.id, job24Id ?? null, job1Id ?? null]
    );
  }
  const stageOrder = ["new", "contacted", "qualified", "demo", "interested", "payment", "admitted"];
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
router22.patch("/:id", ...guard18, async (req, res) => {
  const { status, outcome, notes, location, scheduled_at } = req.body;
  const row = await req.db.query(
    `UPDATE demo_sessions
     SET status       = COALESCE($2, status),
         outcome      = COALESCE($3, outcome),
         notes        = COALESCE($4, notes),
         location     = COALESCE($5, location),
         scheduled_at = COALESCE($6::timestamptz, scheduled_at),
         updated_at   = now()
     WHERE id = $1 RETURNING *`,
    [
      req.params.id,
      status ?? null,
      outcome ?? null,
      notes ?? null,
      location ?? null,
      scheduled_at ?? null
    ]
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router22.delete("/:id", ...guard18, async (req, res) => {
  const existing = await req.db.query("SELECT * FROM demo_sessions WHERE id=$1", [req.params.id]);
  if (!existing.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  await req.db.query(
    "UPDATE demo_sessions SET status='cancelled', updated_at=now() WHERE id=$1",
    [req.params.id]
  );
  res.json({ ok: true });
});
var demos_default = router22;

// server/multitenant/routes/placements.ts
import { Router as Router23 } from "express";
var router23 = Router23();
var guard19 = [tenantFromHeader, authAndTenantGuard];
router23.get("/stats", ...guard19, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      COUNT(*)::int                                                 AS total_placed,
      COUNT(*) FILTER (WHERE verified)::int                        AS verified,
      ROUND(AVG(package_lpa) FILTER (WHERE package_lpa IS NOT NULL), 2) AS avg_package,
      MAX(package_lpa)                                             AS max_package,
      MIN(package_lpa) FILTER (WHERE package_lpa IS NOT NULL)     AS min_package,
      COUNT(DISTINCT company)::int                                 AS companies_count,
      COUNT(*) FILTER (WHERE placement_date >= DATE_TRUNC('year', now()))::int AS this_year,
      -- Placement rate: placed vs total admitted
      ROUND(100.0 * COUNT(DISTINCT p.lead_id) /
        NULLIF((SELECT COUNT(*) FROM leads WHERE stage = 'admitted'), 0), 1) AS placement_rate
    FROM placements p
  `);
  res.json({ ok: true, data: rows.rows[0] });
});
router23.get("/by-course", ...guard19, async (req, res) => {
  const rows = await req.db.query(`
    SELECT
      c.id AS course_id, c.name AS course,
      COUNT(p.id)::int AS placed,
      ROUND(AVG(p.package_lpa), 2) AS avg_package,
      MAX(p.package_lpa) AS max_package
    FROM placements p
    JOIN leads l ON l.id = p.lead_id
    JOIN courses c ON c.id = l.course_id
    GROUP BY c.id, c.name
    ORDER BY placed DESC
  `);
  res.json({ ok: true, data: rows.rows });
});
router23.get("/top-companies", ...guard19, async (req, res) => {
  const rows = await req.db.query(`
    SELECT company, COUNT(*)::int AS count, ROUND(AVG(package_lpa), 2) AS avg_package
    FROM placements
    GROUP BY company
    ORDER BY count DESC
    LIMIT 15
  `);
  res.json({ ok: true, data: rows.rows });
});
router23.get("/", ...guard19, async (req, res) => {
  const { courseId, company, verified, page = "1", limit = "50", search } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (courseId) {
    conds.push(`l.course_id = $${p++}`);
    params.push(courseId);
  }
  if (company) {
    conds.push(`p.company ILIKE $${p++}`);
    params.push(`%${company}%`);
  }
  if (verified === "true") conds.push("p.verified = TRUE");
  if (verified === "false") conds.push("p.verified = FALSE");
  if (search) {
    conds.push(`(l.full_name ILIKE $${p} OR p.company ILIKE $${p} OR p.role ILIKE $${p})`);
    params.push(`%${search}%`);
    p++;
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT p.*,
              l.full_name AS student_name, l.phone AS student_phone,
              c.name AS course_name,
              u.full_name AS created_by_name
       FROM placements p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN courses c ON c.id = l.course_id
       LEFT JOIN users u ON u.id = p.created_by
       WHERE ${where}
       ORDER BY p.placement_date DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM placements p JOIN leads l ON l.id = p.lead_id WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router23.post("/", ...guard19, async (req, res) => {
  const user = req.user;
  const {
    lead_id,
    enrollment_id,
    company,
    role,
    package_lpa,
    placement_date,
    mode = "campus",
    location,
    notes
  } = req.body;
  if (!lead_id || !company || !role) {
    res.status(400).json({ ok: false, message: "lead_id, company, role required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO placements
       (lead_id, enrollment_id, company, role, package_lpa, placement_date, mode, location, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE),$7,$8,$9,$10)
     RETURNING *`,
    [
      lead_id,
      enrollment_id ?? null,
      company,
      role,
      package_lpa ?? null,
      placement_date ?? null,
      mode,
      location ?? null,
      notes ?? null,
      user.id
    ]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router23.patch("/:id", ...guard19, async (req, res) => {
  const user = req.user;
  const { company, role, package_lpa, placement_date, mode, location, notes, verified } = req.body;
  const sets = ["updated_at = now()"];
  const params = [req.params.id];
  let p = 2;
  if (company !== void 0) {
    sets.push(`company=$${p++}`);
    params.push(company);
  }
  if (role !== void 0) {
    sets.push(`role=$${p++}`);
    params.push(role);
  }
  if (package_lpa !== void 0) {
    sets.push(`package_lpa=$${p++}`);
    params.push(package_lpa);
  }
  if (placement_date !== void 0) {
    sets.push(`placement_date=$${p++}::date`);
    params.push(placement_date);
  }
  if (mode !== void 0) {
    sets.push(`mode=$${p++}`);
    params.push(mode);
  }
  if (location !== void 0) {
    sets.push(`location=$${p++}`);
    params.push(location);
  }
  if (notes !== void 0) {
    sets.push(`notes=$${p++}`);
    params.push(notes);
  }
  if (verified !== void 0) {
    sets.push(`verified=$${p++}`);
    params.push(verified);
    sets.push(`verified_by=$${p++}`);
    params.push(user.id);
  }
  const row = await req.db.query(
    `UPDATE placements SET ${sets.join(",")} WHERE id=$1 RETURNING *`,
    params
  );
  if (!row.rows.length) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
router23.delete("/:id", ...guard19, async (req, res) => {
  await req.db.query("DELETE FROM placements WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
var placements_default = router23;

// server/multitenant/routes/activities.ts
import { Router as Router24 } from "express";
var router24 = Router24();
var guard20 = [tenantFromHeader, authAndTenantGuard];
router24.get("/today-summary", ...guard20, async (req, res) => {
  const { userId } = req.query;
  const targetUser = userId ?? req.user?.id;
  const [summary, byCounsellor] = await Promise.all([
    req.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE activity_type = 'call')::int          AS calls_today,
         COUNT(*) FILTER (WHERE activity_type = 'call'
           AND outcome IN ('reached','interested','not_interested'))::int AS calls_reached,
         COALESCE(SUM(duration_sec) FILTER (WHERE activity_type='call'), 0)::int AS total_call_sec,
         COUNT(*) FILTER (WHERE activity_type = 'whatsapp')::int      AS wa_sent_today,
         COUNT(DISTINCT lead_id)::int                                  AS unique_leads_contacted
       FROM activity_logs
       WHERE user_id = $1
         AND created_at::date = CURRENT_DATE`,
      [targetUser]
    ),
    // All counsellors today (for managers)
    req.db.query(`
      SELECT
        u.id, u.full_name,
        COUNT(al.id) FILTER (WHERE al.activity_type='call')::int                AS calls_today,
        COUNT(al.id) FILTER (WHERE al.activity_type='call'
          AND al.outcome IN ('reached','interested'))::int                       AS calls_reached,
        COUNT(DISTINCT al.lead_id)::int                                         AS leads_contacted,
        COALESCE(ct.calls_target, 0)::int                                       AS calls_target,
        ROUND(100.0 * COUNT(al.id) FILTER (WHERE al.activity_type='call') /
          NULLIF(ct.calls_target, 0), 0)                                        AS pct_calls
      FROM users u
      LEFT JOIN activity_logs al
        ON al.user_id = u.id AND al.created_at::date = CURRENT_DATE
      LEFT JOIN counsellor_targets ct
        ON ct.user_id = u.id
        AND ct.month = EXTRACT(MONTH FROM now())::int
        AND ct.year  = EXTRACT(YEAR  FROM now())::int
      WHERE u.role IN ('counsellor','manager') AND u.is_active = TRUE
      GROUP BY u.id, u.full_name, ct.calls_target
      ORDER BY calls_today DESC
    `)
  ]);
  res.json({ ok: true, data: { summary: summary.rows[0], byCounsellor: byCounsellor.rows } });
});
router24.get("/", ...guard20, async (req, res) => {
  const { userId, leadId, type, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg2 - 1) * lm;
  const conds = ["1=1"];
  const params = [];
  let p = 1;
  if (userId) {
    conds.push(`al.user_id = $${p++}`);
    params.push(userId);
  }
  if (leadId) {
    conds.push(`al.lead_id = $${p++}`);
    params.push(leadId);
  }
  if (type) {
    conds.push(`al.activity_type = $${p++}`);
    params.push(type);
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT al.*, u.full_name AS counsellor_name, l.full_name AS lead_name
       FROM activity_logs al
       JOIN users u ON u.id = al.user_id
       LEFT JOIN leads l ON l.id = al.lead_id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM activity_logs al WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router24.post("/", ...guard20, async (req, res) => {
  const user = req.user;
  const { lead_id, activity_type, duration_sec, outcome, notes } = req.body;
  if (!activity_type) {
    res.status(400).json({ ok: false, message: "activity_type required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO activity_logs (lead_id, user_id, activity_type, duration_sec, outcome, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [lead_id ?? null, user.id, activity_type, duration_sec ?? null, outcome ?? null, notes ?? null]
  );
  if (lead_id) {
    await req.db.query(
      "UPDATE leads SET last_contacted_at=now(), updated_at=now() WHERE id=$1",
      [lead_id]
    );
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});
var activities_default = router24;

// server/multitenant/routes/nps.ts
import { Router as Router25 } from "express";
init_whatsappService();
init_logger();
var router25 = Router25();
var guard21 = [tenantFromHeader, authAndTenantGuard];
router25.get("/", ...guard21, async (req, res) => {
  const { courseId, batchId, fromDate, toDate, page = "1", limit = "50" } = req.query;
  const pg2 = Math.max(1, parseInt(page));
  const lm = Math.min(200, parseInt(limit));
  const off = (pg2 - 1) * lm;
  let p = 1;
  const conds = ["1=1"];
  const params = [];
  if (courseId) {
    conds.push(`n.course_id = $${p++}`);
    params.push(courseId);
  }
  if (batchId) {
    conds.push(`n.batch_id = $${p++}`);
    params.push(batchId);
  }
  if (fromDate) {
    conds.push(`n.created_at >= $${p++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conds.push(`n.created_at <= $${p++}`);
    params.push(toDate);
  }
  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT n.*, l.full_name AS student_name, l.phone AS student_phone,
              c.name AS course_name, b.name AS batch_name
       FROM nps_responses n
       JOIN leads l ON l.id = n.lead_id
       LEFT JOIN courses c ON c.id = n.course_id
       LEFT JOIN batches b ON b.id = n.batch_id
       WHERE ${where}
       ORDER BY n.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM nps_responses n WHERE ${where}`, params)
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg2, limit: lm } });
});
router25.get("/stats", ...guard21, async (req, res) => {
  const { courseId, batchId, fromDate, toDate } = req.query;
  let p = 1;
  const conds = ["1=1"];
  const params = [];
  if (courseId) {
    conds.push(`course_id = $${p++}`);
    params.push(courseId);
  }
  if (batchId) {
    conds.push(`batch_id = $${p++}`);
    params.push(batchId);
  }
  if (fromDate) {
    conds.push(`created_at >= $${p++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conds.push(`created_at <= $${p++}`);
    params.push(toDate);
  }
  const where = conds.join(" AND ");
  const [overall, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         COUNT(*) FILTER (WHERE responded_at IS NOT NULL) AS responses,
         COUNT(*) AS sent,
         ROUND(AVG(score) FILTER (WHERE responded_at IS NOT NULL), 2) AS avg_score,
         COUNT(*) FILTER (WHERE category='promoter') AS promoters,
         COUNT(*) FILTER (WHERE category='passive')  AS passives,
         COUNT(*) FILTER (WHERE category='detractor') AS detractors,
         ROUND(
           (COUNT(*) FILTER (WHERE category='promoter') - COUNT(*) FILTER (WHERE category='detractor'))::numeric
           / NULLIF(COUNT(*) FILTER (WHERE responded_at IS NOT NULL), 0) * 100
         , 1) AS nps_score
       FROM nps_responses WHERE ${where}`,
      params
    ),
    req.db.query(
      `SELECT c.name AS course_name, c.id AS course_id,
              COUNT(*) FILTER (WHERE n.responded_at IS NOT NULL) AS responses,
              ROUND(AVG(n.score) FILTER (WHERE n.responded_at IS NOT NULL), 2) AS avg_score,
              ROUND(
                (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
                / NULLIF(COUNT(*) FILTER (WHERE n.responded_at IS NOT NULL), 0) * 100
              , 1) AS nps_score
       FROM nps_responses n
       LEFT JOIN courses c ON c.id = n.course_id
       WHERE ${where}
       GROUP BY c.id, c.name
       ORDER BY nps_score DESC NULLS LAST`,
      params
    )
  ]);
  res.json({ ok: true, data: { overall: overall.rows[0], byCourse: byCourse.rows } });
});
router25.post("/send", ...guard21, async (req, res) => {
  const { lead_id, batch_id, course_id } = req.body;
  if (!lead_id) {
    res.status(400).json({ ok: false, message: "lead_id required" });
    return;
  }
  const lead = await req.db.query("SELECT full_name, phone FROM leads WHERE id=$1", [lead_id]);
  if (!lead.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO nps_responses (lead_id, batch_id, course_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [lead_id, batch_id ?? null, course_id ?? null]
  );
  const { full_name, phone } = lead.rows[0];
  const msg = `Hi ${full_name}, thank you for completing your course with us! \u{1F393}
On a scale of 0\u201310, how likely are you to recommend us to a friend?
Reply with your score (0-10) and any feedback.`;
  try {
    await whatsappService.sendText(phone, msg);
    logger_default.info({ leadId: lead_id }, "NPS survey sent");
  } catch (err) {
    logger_default.warn({ leadId: lead_id, err }, "NPS WhatsApp send failed");
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});
router25.post("/respond", async (req, res) => {
  const { phone, score, comment } = req.body;
  if (phone === void 0 || score === void 0) {
    res.status(400).json({ ok: false, message: "phone and score required" });
    return;
  }
  const sc = parseInt(String(score));
  if (isNaN(sc) || sc < 0 || sc > 10) {
    res.status(400).json({ ok: false, message: "score must be 0-10" });
    return;
  }
  const leadRow = await req.db?.query("SELECT id FROM leads WHERE phone=$1 LIMIT 1", [phone]);
  if (!leadRow?.rows[0]) {
    res.status(404).json({ ok: false, message: "Lead not found" });
    return;
  }
  const leadId = leadRow.rows[0].id;
  const updated = await req.db.query(
    `UPDATE nps_responses SET score=$2, comment=$3, responded_at=now()
     WHERE lead_id=$1 AND responded_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
     RETURNING *`,
    [leadId, sc, comment ?? null]
  );
  res.json({ ok: true, data: updated.rows[0] ?? null });
});
router25.get("/:id", ...guard21, async (req, res) => {
  const row = await req.db.query(
    `SELECT n.*, l.full_name AS student_name, l.phone AS student_phone,
            c.name AS course_name, b.name AS batch_name
     FROM nps_responses n
     JOIN leads l ON l.id = n.lead_id
     LEFT JOIN courses c ON c.id = n.course_id
     LEFT JOIN batches b ON b.id = n.batch_id
     WHERE n.id = $1`,
    [req.params.id]
  );
  if (!row.rows[0]) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: row.rows[0] });
});
var nps_default = router25;

// server/multitenant/routes/broadcasts.ts
import { Router as Router26 } from "express";
init_whatsappService();
init_logger();
var router26 = Router26();
var guard22 = [tenantFromHeader, authAndTenantGuard];
router26.get("/", ...guard22, async (req, res) => {
  const rows = await req.db.query(
    `SELECT b.*, u.full_name AS created_by_name
     FROM broadcasts b
     LEFT JOIN users u ON u.id = b.created_by
     ORDER BY b.created_at DESC LIMIT 100`
  );
  res.json({ ok: true, data: rows.rows });
});
router26.post("/", ...guard22, async (req, res) => {
  const user = req.user;
  const { name, message_body, template_id, filters = {} } = req.body;
  if (!name || !message_body) {
    res.status(400).json({ ok: false, message: "name and message_body required" });
    return;
  }
  const { stage, courseId, batchId, source, assignedTo } = filters;
  const conds = ["l.phone IS NOT NULL AND l.phone != ''"];
  const params = [];
  let p = 1;
  if (stage) {
    conds.push(`l.stage = $${p++}`);
    params.push(stage);
  }
  if (courseId) {
    conds.push(`l.course_id = $${p++}`);
    params.push(courseId);
  }
  if (source) {
    conds.push(`l.source = $${p++}`);
    params.push(source);
  }
  if (assignedTo) {
    conds.push(`l.assigned_to = $${p++}`);
    params.push(assignedTo);
  }
  if (batchId) {
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
    [
      name,
      message_body,
      template_id ?? null,
      JSON.stringify(filters),
      parseInt(count.rows[0].count),
      user.id
    ]
  );
  res.status(201).json({ ok: true, data: row.rows[0], preview: { recipientCount: parseInt(count.rows[0].count) } });
});
router26.post("/:id/send", ...guard22, async (req, res) => {
  const bc = await req.db.query("SELECT * FROM broadcasts WHERE id=$1", [req.params.id]);
  if (!bc.rows[0]) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  const broadcast = bc.rows[0];
  if (!["draft", "failed"].includes(broadcast.status)) {
    res.status(400).json({ ok: false, message: `Cannot send broadcast in status: ${broadcast.status}` });
    return;
  }
  await req.db.query(
    "UPDATE broadcasts SET status='running', started_at=now() WHERE id=$1",
    [req.params.id]
  );
  res.json({ ok: true, message: "Broadcast started" });
  const filters = broadcast.filters;
  const { stage, courseId, batchId, source, assignedTo } = filters;
  const conds = ["l.phone IS NOT NULL AND l.phone != ''"];
  const params = [];
  let p = 1;
  if (stage) {
    conds.push(`l.stage = $${p++}`);
    params.push(stage);
  }
  if (courseId) {
    conds.push(`l.course_id = $${p++}`);
    params.push(courseId);
  }
  if (source) {
    conds.push(`l.source = $${p++}`);
    params.push(source);
  }
  if (assignedTo) {
    conds.push(`l.assigned_to = $${p++}`);
    params.push(assignedTo);
  }
  if (batchId) {
    conds.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.lead_id = l.id AND e.batch_id = $${p++})`);
    params.push(batchId);
  }
  const leads2 = await req.db.query(
    `SELECT l.id, l.phone, l.full_name FROM leads l WHERE ${conds.join(" AND ")}`,
    params
  );
  if (leads2.rows.length) {
    const vals = leads2.rows.map(
      (_, i) => `($1,$${i * 2 + 2},$${i * 2 + 3})`
    ).join(",");
    const rParams = [req.params.id];
    leads2.rows.forEach((l) => {
      rParams.push(l.id, l.phone);
    });
    await req.db.query(
      `INSERT INTO broadcast_recipients (broadcast_id, lead_id, phone)
       VALUES ${vals} ON CONFLICT DO NOTHING`,
      rParams
    );
  }
  let sent = 0, failed = 0;
  for (const lead of leads2.rows) {
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
      logger_default.warn({ broadcastId: req.params.id, leadId: lead.id, err }, "Broadcast send failed");
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  await req.db.query(
    `UPDATE broadcasts SET status='completed', completed_at=now(),
     sent_count=$2, failed_count=$3, total_count=$4 WHERE id=$1`,
    [req.params.id, sent, failed, sent + failed]
  );
  logger_default.info({ broadcastId: req.params.id, sent, failed }, "Broadcast completed");
});
router26.get("/:id", ...guard22, async (req, res) => {
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
    )
  ]);
  if (!bc.rows[0]) {
    res.status(404).json({ ok: false, message: "Not found" });
    return;
  }
  res.json({ ok: true, data: { ...bc.rows[0], recipients: recipients.rows } });
});
router26.delete("/:id", ...guard22, async (req, res) => {
  await req.db.query("DELETE FROM broadcasts WHERE id=$1 AND status='draft'", [req.params.id]);
  res.json({ ok: true });
});
var broadcasts_default = router26;

// server/multitenant/server.ts
patchAsyncErrors();
function createApp() {
  const app = express();
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(
    "/api/webhooks/meta",
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      req.rawBody = req.body;
      next();
    }
  );
  app.use("/api/webhooks/razorpay", express.json());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", apiRateLimit);
  app.use("/api/auth", auth_default);
  app.use("/api/leads", leads_default);
  app.use("/api/tasks", tasks_default);
  app.use("/api/comms", communications_default);
  app.use("/api/campaigns", campaigns_default);
  app.use("/api/automation", automation_default);
  app.use("/api/reports", reports_default);
  app.use("/api/admin", admin_default);
  app.use("/api/reengagement", reengagement_default);
  app.use("/api/notifications", notifications_default);
  app.use("/api/students", students_default);
  app.use("/api/pipeline", pipeline_default);
  app.use("/api/webhooks", webhooks_default);
  app.use("/api/payments", payments_default);
  app.use("/api/companies", companies_default);
  app.use("/api/batches", batches_default);
  app.use("/api/targets", targets_default);
  app.use("/api/quotations", quotations_default);
  app.use("/api/attendance", attendance_default);
  app.use("/api/demos", demos_default);
  app.use("/api/placements", placements_default);
  app.use("/api/activities", activities_default);
  app.use("/api/nps", nps_default);
  app.use("/api/broadcasts", broadcasts_default);
  if (env.NODE_ENV === "development") {
    app.use("/api/dev", devTools_default);
    app.use("/api/internal/meta", metaConsole_default);
  }
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "aadhirai-crm", ts: (/* @__PURE__ */ new Date()).toISOString() });
  });
  if (env.NODE_ENV === "production") {
    import("path").then(({ default: path3 }) => {
      import("url").then(({ fileURLToPath: fileURLToPath2 }) => {
        const __dirname = path3.dirname(fileURLToPath2(import.meta.url));
        const websiteDir = path3.join(__dirname, "../../website");
        const crmPublic = path3.join(__dirname, "../public");
        app.use("/assets/css", express.static(path3.join(websiteDir, "assets/css")));
        app.use("/assets/js", express.static(path3.join(websiteDir, "assets/js")));
        app.use("/assets/images", express.static(path3.join(websiteDir, "assets/images")));
        app.use(express.static(crmPublic));
        app.get("/", (_req, res) => {
          res.sendFile(path3.join(websiteDir, "index.html"));
        });
        app.get("*", (_req, res) => {
          res.sendFile(path3.join(crmPublic, "index.html"));
        });
      });
    });
  }
  app.use(errorHandler);
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true
    },
    path: "/socket.io"
  });
  io.use((socket, next) => {
    const tenantId = socket.handshake.auth["tenantId"];
    const userId = socket.handshake.auth["userId"];
    if (!tenantId) {
      next(new Error("Missing tenantId"));
      return;
    }
    socket.join(`tenant:${tenantId}`);
    if (userId) socket.join(`user:${userId}`);
    next();
  });
  setIo(io);
  app.io = io;
  return { app, httpServer, io };
}

// server/multitenant/start.ts
init_registry();
init_dbPool();
init_logger();
init_redisClient();
init_automationQueue();
init_communicationQueue();
init_followUpQueue();
async function main() {
  logger_default.info({ nodeEnv: env.NODE_ENV }, "Starting Aadhirai CRM...");
  loadRegistry();
  await ensureAllTenantsReady();
  const workers = [];
  const redisOk = await probeRedis();
  if (redisOk) {
    setAutomationRedisAvailable(true);
    setCommunicationRedisAvailable(true);
    setFollowUpRedisAvailable(true);
    const [
      { startAutomationWorker: startAutomationWorker2 },
      { startCommunicationWorker: startCommunicationWorker2 },
      { startSlaWorker: startSlaWorker2 },
      { startFollowUpWorker: startFollowUpWorker2 },
      { startReEngagementWorker: startReEngagementWorker2 },
      { startInstallmentWorker: startInstallmentWorker2 },
      { startNpsWorker: startNpsWorker2 },
      { startDigestWorker: startDigestWorker2 },
      { startSlaCron: startSlaCron2 },
      { startReEngagementCron: startReEngagementCron2 },
      { startInstallmentCron: startInstallmentCron2 },
      { startNpsCron: startNpsCron2 },
      { startDigestCron: startDigestCron2 }
    ] = await Promise.all([
      Promise.resolve().then(() => (init_automationWorker(), automationWorker_exports)),
      Promise.resolve().then(() => (init_communicationWorker(), communicationWorker_exports)),
      Promise.resolve().then(() => (init_slaWorker(), slaWorker_exports)),
      Promise.resolve().then(() => (init_followUpWorker(), followUpWorker_exports)),
      Promise.resolve().then(() => (init_reEngagementWorker(), reEngagementWorker_exports)),
      Promise.resolve().then(() => (init_installmentWorker(), installmentWorker_exports)),
      Promise.resolve().then(() => (init_npsWorker(), npsWorker_exports)),
      Promise.resolve().then(() => (init_digestWorker(), digestWorker_exports)),
      Promise.resolve().then(() => (init_slaQueue(), slaQueue_exports)),
      Promise.resolve().then(() => (init_reEngagementQueue(), reEngagementQueue_exports)),
      Promise.resolve().then(() => (init_installmentQueue(), installmentQueue_exports)),
      Promise.resolve().then(() => (init_npsQueue(), npsQueue_exports)),
      Promise.resolve().then(() => (init_digestQueue(), digestQueue_exports))
    ]);
    workers.push(
      startAutomationWorker2(),
      startCommunicationWorker2(),
      startSlaWorker2(),
      startFollowUpWorker2(),
      startReEngagementWorker2(),
      startInstallmentWorker2(),
      startNpsWorker2(),
      startDigestWorker2()
    );
    logger_default.info({ count: workers.length }, "BullMQ workers started");
    const tenantIds = Object.keys(getRegistry().tenants);
    await Promise.all([
      startSlaCron2(tenantIds),
      startReEngagementCron2(tenantIds),
      startInstallmentCron2(tenantIds),
      startNpsCron2(tenantIds),
      startDigestCron2(tenantIds)
    ]);
    logger_default.info("CRON jobs scheduled");
  } else {
    logger_default.warn(
      "Redis unavailable \u2014 BullMQ workers/crons skipped. Queued tasks (email, SMS, automation) will not run."
    );
  }
  const { httpServer } = createApp();
  await new Promise((resolve) => {
    httpServer.listen(env.PORT, () => {
      logger_default.info({ port: env.PORT }, "CRM server listening");
      resolve();
    });
  });
  const shutdown = async (signal) => {
    logger_default.info({ signal }, "Shutting down...");
    await Promise.all(workers.map((w) => w.close()));
    await closeAllPools();
    httpServer.close(() => {
      logger_default.info("HTTP server closed");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 1e4);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.js.map
