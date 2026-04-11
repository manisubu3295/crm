import { z } from "zod";
import { config } from "dotenv";

// Load .env before schema validation (safe no-op if vars already injected)
config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Multi-tenancy
  TENANT_REGISTRY_PATH: z.string(),
  TENANT_ADMIN_KEY: z.string().optional(),
  DEMO_TENANT_ID: z.string().default("demo"),
  DEMO_TENANT_FALLBACK: z.coerce.boolean().default(false),
  TENANT_DB_POOL_MAX: z.coerce.number().default(10),
  TENANT_DB_IDLE_MS: z.coerce.number().default(30000),
  TENANT_DB_CONN_MS: z.coerce.number().default(5000),

  // Security
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
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
  TEMPLATE_CACHE_TTL_MS: z.coerce.number().default(600000),

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
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
