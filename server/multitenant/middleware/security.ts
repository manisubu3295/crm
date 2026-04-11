import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "../env.js";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: false,
});

export const corsMiddleware = cors({
  origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  credentials: true,
});

export const authRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20, // Stricter for auth endpoints
  message: { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
