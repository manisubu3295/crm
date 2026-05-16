import express, { type Express } from "express";
import { createServer, request as httpRequest } from "http";
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
import activitiesRouter   from "./routes/activities.js";
import npsRouter          from "./routes/nps.js";
import broadcastsRouter      from "./routes/broadcasts.js";
import publicEnquiryRouter   from "./routes/publicEnquiry.js";
import enquiriesRouter       from "./routes/enquiries.js";

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
  app.use("/api/activities",   activitiesRouter);
  app.use("/api/nps",          npsRouter);
  app.use("/api/broadcasts",    broadcastsRouter);

  // Public enquiry — no auth required (website contact form)
  app.use("/api/public/enquiry", publicEnquiryRouter);

  // Web enquiries — authenticated (CRM staff view)
  app.use("/api/enquiries", enquiriesRouter);

  // Dev tools — only available in development
  if (env.NODE_ENV === "development") {
    app.use("/api/dev", devToolsRouter);
    app.use("/api/internal/meta", metaConsoleRouter);
  }

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "marcellotech-crm", ts: new Date().toISOString() });
  });

  // Serve React website + CRM app in production
  if (env.NODE_ENV === "production") {
    import("path").then(({ default: path }) => {
      import("url").then(({ fileURLToPath }) => {
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        // dist/multitenant/ → project root
        const websiteDist = path.join(__dirname, "../../website/dist");
        const crmPublic   = path.join(__dirname, "../public");

        // Serve website static assets (Vite build — hashed filenames, no collision)
        app.use(express.static(websiteDist, { index: false }));
        // Serve CRM static assets
        app.use(express.static(crmPublic, { index: false }));

        // Public website SPA routes → website React app
        const websiteRoutes = ["/", "/courses", "/certified", "/projects", "/products", "/about", "/contact"];
        for (const route of websiteRoutes) {
          app.get(route, (_req, res) => res.sendFile(path.join(websiteDist, "index.html")));
        }
        app.get("/courses/*", (_req, res) => res.sendFile(path.join(websiteDist, "index.html")));

        // All other non-API routes → CRM SPA
        app.get("*", (_req, res) => {
          res.sendFile(path.join(crmPublic, "index.html"));
        });
      });
    });
  }

  // In development, mirror production routing:
  //   - known website SPA routes → website Vite dev server (port 5174)
  //   - everything else          → CRM Vite dev server    (port 5173)
  if (env.NODE_ENV !== "production") {
    const WEBSITE_DEV_PORT = 5174;
    const CRM_DEV_PORT     = 5173;

    // Same set as production websiteRoutes + prefix wildcards
    const WEBSITE_PATHS = new Set(["/", "/courses", "/certified", "/projects", "/products", "/about", "/contact"]);
    const isWebsitePath = (p: string) =>
      WEBSITE_PATHS.has(p) || p.startsWith("/courses/");

    app.use((req, res, next) => {
      if (req.path.startsWith("/api/") || req.path === "/health") { next(); return; }
      const port = isWebsitePath(req.path) ? WEBSITE_DEV_PORT : CRM_DEV_PORT;
      const label = port === WEBSITE_DEV_PORT ? "Website" : "CRM";
      const cmd   = port === WEBSITE_DEV_PORT ? "cd website && npm run dev" : "npm run dev:client";

      const proxyReq = httpRequest(
        {
          hostname: "::1",
          port,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `localhost:${port}` },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode!, proxyRes.headers as any);
          proxyRes.pipe(res);
        }
      );
      proxyReq.on("error", () => {
        res.status(503).type("html").send(
          `<pre style="padding:2rem;font-family:monospace">${label} dev server not running on port ${port}.\nStart it: ${cmd}</pre>`
        );
      });
      proxyReq.end();
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
