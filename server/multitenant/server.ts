import express, { type Express } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";
import { helmetMiddleware, corsMiddleware, apiRateLimit } from "./middleware/security.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { patchAsyncErrors } from "./middleware/patchAsyncErrors.js";

// Must run before any routes are registered
patchAsyncErrors();
import { env } from "./env.js";
import { setIo } from "./lib/ioRegistry.js";

import authRouter        from "./routes/auth.js";
import leadsRouter       from "./routes/leads.js";
import tasksRouter       from "./routes/tasks.js";
import communicationsRouter from "./routes/communications.js";
import campaignsRouter   from "./routes/campaigns.js";
import automationRouter  from "./routes/automation.js";
import reportsRouter     from "./routes/reports.js";
import adminRouter        from "./routes/admin.js";
import webhooksRouter     from "./routes/webhooks.js";
import reengagementRouter from "./routes/reengagement.js";
import notificationsRouter from "./routes/notifications.js";
import studentsRouter     from "./routes/students.js";
import pipelineRouter     from "./routes/pipeline.js";
import devToolsRouter     from "./routes/devTools.js";
import metaConsoleRouter  from "./routes/metaConsole.js";
import paymentsRouter     from "./routes/payments.js";
import companiesRouter    from "./routes/companies.js";
import batchesRouter      from "./routes/batches.js";
import targetsRouter      from "./routes/targets.js";
import quotationsRouter   from "./routes/quotations.js";
import attendanceRouter   from "./routes/attendance.js";
import demosRouter        from "./routes/demos.js";
import placementsRouter   from "./routes/placements.js";

export function createApp(): {
  app: Express;
  httpServer: ReturnType<typeof createServer>;
  io: SocketIOServer;
} {
  const app = express();

  // ─── Security & Parsing ────────────────────────────────────
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Raw body capture for Meta webhook HMAC verification
  app.use(
    "/api/webhooks/meta",
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      (req as unknown as { rawBody: Buffer }).rawBody = req.body as Buffer;
      next();
    }
  );

  // Razorpay webhook — JSON body (signature verified inside handler)
  app.use("/api/webhooks/razorpay", express.json());

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ─── API Rate Limiting ─────────────────────────────────────
  app.use("/api", apiRateLimit);

  // ─── Routes ───────────────────────────────────────────────
  app.use("/api/auth",        authRouter);
  app.use("/api/leads",       leadsRouter);
  app.use("/api/tasks",       tasksRouter);
  app.use("/api/comms",       communicationsRouter);
  app.use("/api/campaigns",   campaignsRouter);
  app.use("/api/automation",  automationRouter);
  app.use("/api/reports",     reportsRouter);
  app.use("/api/admin",         adminRouter);
  app.use("/api/reengagement",  reengagementRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/students",      studentsRouter);
  app.use("/api/pipeline",      pipelineRouter);
  app.use("/api/webhooks",      webhooksRouter);
  app.use("/api/payments",     paymentsRouter);
  app.use("/api/companies",    companiesRouter);
  app.use("/api/batches",      batchesRouter);
  app.use("/api/targets",      targetsRouter);
  app.use("/api/quotations",   quotationsRouter);
  app.use("/api/attendance",   attendanceRouter);
  app.use("/api/demos",        demosRouter);
  app.use("/api/placements",   placementsRouter);

  // Dev tools — only available in development
  if (env.NODE_ENV === "development") {
    app.use("/api/dev", devToolsRouter);
    app.use("/api/internal/meta", metaConsoleRouter);
  }

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "aadhirai-crm", ts: new Date().toISOString() });
  });

  // Serve Vite build in production
  if (env.NODE_ENV === "production") {
    import("path").then(({ default: path }) => {
      import("url").then(({ fileURLToPath }) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        app.use(express.static(path.join(__dirname, "../public")));
        app.get("*", (_req, res) => {
          res.sendFile(path.join(__dirname, "../public/index.html"));
        });
      });
    });
  }

  // ─── Error Handler (must be last) ─────────────────────────
  app.use(errorHandler as any);

  // ─── HTTP + Socket.io ──────────────────────────────────────
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
    },
    path: "/socket.io",
  });

  // Tenant-scoped rooms via JWT validation
  io.use((socket, next) => {
    const tenantId = socket.handshake.auth["tenantId"] as string | undefined;
    const userId   = socket.handshake.auth["userId"]   as string | undefined;
    if (!tenantId) { next(new Error("Missing tenantId")); return; }
    socket.join(`tenant:${tenantId}`);
    if (userId) socket.join(`user:${userId}`);
    next();
  });

  // Register io globally for services/workers
  setIo(io);

  // Attach io to app for use in route handlers
  (app as unknown as { io: SocketIOServer }).io = io;

  return { app, httpServer, io };
}
