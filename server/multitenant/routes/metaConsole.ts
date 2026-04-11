/**
 * Internal Meta WhatsApp Test Console — Express routes.
 *
 * Mounted at /api/internal/meta (dev mode only — see server.ts).
 * Never exposed in production.
 *
 * Routes:
 *   GET    /status                  – config & connectivity status
 *   POST   /webhook/verify-test     – simulate Meta webhook GET verification
 *   POST   /messages/send           – send text or template message via Meta
 *   GET    /webhook/logs            – list captured webhook events
 *   DELETE /webhook/logs            – clear all webhook logs
 *   POST   /webhook/simulate        – inject a synthetic payload through the parser
 *   GET    /messages/history        – list messages sent from this console
 */
import { Router } from "express";
import axios from "axios";
import { env } from "../env.js";
import { metaConsoleStore } from "../lib/metaConsoleStore.js";
import { parseMetaWebhookPayload, type ParsedWebhookEvent } from "../lib/metaWebhookParser.js";
import logger from "../logger.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────

/** Mask a secret value: show last 4 chars, replace the rest with *** (max 8 stars). */
function mask(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}`;
}

/** Structured success wrapper */
function ok<T>(data: T) {
  return { ok: true, data };
}

// ─── GET /status ──────────────────────────────────────────────

router.get("/status", (_req, res) => {
  const hasAccessToken  = !!env.META_ACCESS_TOKEN;
  const hasPhoneNumberId = !!env.META_PHONE_NUMBER_ID;
  const hasAppSecret    = !!env.META_APP_SECRET;
  const hasVerifyToken  = !!env.META_VERIFY_TOKEN;

  const configured = [hasAccessToken, hasPhoneNumberId, hasAppSecret, hasVerifyToken]
    .filter(Boolean).length;

  const overallStatus =
    configured === 4 ? "ready" : configured > 0 ? "partial" : "not_configured";

  res.json(ok({
    apiVersion:      env.META_API_VERSION,
    environment:     env.NODE_ENV,
    webhookEndpoint: "/api/webhooks/meta",
    overallStatus,

    // Binary presence flags (safe to expose)
    hasAccessToken,
    hasPhoneNumberId,
    hasAppSecret,
    hasVerifyToken,

    // Masked values — last 4 chars only
    maskedAccessToken:   mask(env.META_ACCESS_TOKEN),
    maskedAppSecret:     mask(env.META_APP_SECRET),
    maskedPhoneNumberId: mask(env.META_PHONE_NUMBER_ID),
    maskedVerifyToken:   mask(env.META_VERIFY_TOKEN),
  }));
});

// ─── POST /webhook/verify-test ────────────────────────────────

router.post("/webhook/verify-test", (req, res) => {
  const { mode, verifyToken, challenge } = req.body as {
    mode?: string;
    verifyToken?: string;
    challenge?: string;
  };

  const modeMatch  = mode === "subscribe";
  const tokenMatch = verifyToken === env.META_VERIFY_TOKEN;
  const passed     = modeMatch && tokenMatch;

  let explanation: string;
  if (passed) {
    explanation =
      "Verification passed. Meta would echo back the challenge value with HTTP 200.";
  } else if (!modeMatch) {
    explanation = `Mode mismatch: expected "subscribe", received "${mode ?? "(empty)"}"`;
  } else {
    explanation =
      "Verify token does not match META_VERIFY_TOKEN in .env. " +
      "Update the token in your Meta App webhook settings to match.";
  }

  res.json(ok({
    passed,
    httpStatus: passed ? 200 : 403,
    responseBody: passed ? challenge : null,
    explanation,
    checks: { modeMatch, tokenMatch },
  }));
});

// ─── POST /messages/send ──────────────────────────────────────

router.post("/messages/send", async (req, res) => {
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    res.status(503).json({
      ok: false,
      message: "META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not configured in .env",
    });
    return;
  }

  const {
    to, type, body: textBody,
    templateName, languageCode,
  } = req.body as {
    to?: string;
    type?: "text" | "template";
    body?: string;
    templateName?: string;
    languageCode?: string;
  };

  if (!to || !type) {
    res.status(400).json({ ok: false, message: '"to" and "type" are required' });
    return;
  }

  // Build the Meta request payload
  let requestPayload: Record<string, unknown>;

  if (type === "text") {
    if (!textBody) {
      res.status(400).json({ ok: false, message: '"body" is required for text messages' });
      return;
    }
    requestPayload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: textBody },
    };
  } else {
    if (!templateName || !languageCode) {
      res.status(400).json({
        ok: false,
        message: '"templateName" and "languageCode" are required for template messages',
      });
      return;
    }
    requestPayload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: templateName, language: { code: languageCode } },
    };
  }

  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`;

  let metaResponse: unknown;
  let success = false;
  let messageId: string | undefined;
  let errorMsg: string | undefined;

  try {
    const axiosRes = await axios.post(url, requestPayload, {
      headers: {
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      validateStatus: () => true, // always return — don't throw on 4xx/5xx
    });

    metaResponse = axiosRes.data;
    success = axiosRes.status >= 200 && axiosRes.status < 300;

    if (success) {
      const msgs = (axiosRes.data as Record<string, unknown>)?.messages;
      if (Array.isArray(msgs) && typeof (msgs[0] as Record<string, unknown>)?.id === "string") {
        messageId = (msgs[0] as Record<string, unknown>).id as string;
      }
    } else {
      const errObj = (axiosRes.data as Record<string, unknown>)?.error as Record<string, unknown> | undefined;
      errorMsg = (errObj?.message as string) ?? `HTTP ${axiosRes.status}`;
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Network error";
    metaResponse = { error: errorMsg };
  }

  logger.info({ to, type, success, messageId }, "MetaConsole: message send attempt");

  // Persist to history
  metaConsoleStore.addSentMessage({
    to,
    type,
    preview: type === "text"
      ? (textBody?.slice(0, 80) ?? "")
      : `template: ${templateName}`,
    success,
    requestPayload,
    metaResponse,
    error: errorMsg,
  });

  res.json({
    ok: success,
    data: { success, messageId, metaResponse, requestPayload },
    ...(errorMsg && { message: errorMsg }),
  });
});

// ─── GET /webhook/logs ────────────────────────────────────────

router.get("/webhook/logs", (_req, res) => {
  res.json(ok(metaConsoleStore.getWebhookLogs()));
});

// ─── DELETE /webhook/logs ─────────────────────────────────────

router.delete("/webhook/logs", (_req, res) => {
  metaConsoleStore.clearWebhookLogs();
  res.json({ ok: true, message: "Webhook logs cleared" });
});

// ─── POST /webhook/simulate ───────────────────────────────────

router.post("/webhook/simulate", (req, res) => {
  const payload = req.body as unknown;

  let parsedEntries: ParsedWebhookEvent[] = [];
  const errors: string[] = [];

  try {
    parsedEntries = parseMetaWebhookPayload(payload);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : "Unexpected parse error");
  }

  // Derive summary fields from first meaningful event
  const firstMsg    = parsedEntries.find((e) => e.eventType === "message_in");
  const firstStatus = parsedEntries.find((e) => e.eventType === "status_update");
  const primary     = firstMsg ?? firstStatus ?? parsedEntries[0];

  const logEntry = metaConsoleStore.addWebhookLog({
    source: "simulated",
    eventType: primary?.eventType ?? "unknown",
    from:        primary?.from ?? primary?.statusRecipient,
    messageType: primary?.messageType,
    preview:     primary?.messageBody?.slice(0, 100),
    status:      errors.length > 0 ? "error" : "parsed",
    rawPayload:  payload,
    parsedEntries,
  });

  res.json({
    ok: errors.length === 0,
    data: {
      source: "simulated",
      logId: logEntry.id,
      parsedEntries,
      ...(errors.length > 0 && { errors }),
    },
  });
});

// ─── GET /messages/history ────────────────────────────────────

router.get("/messages/history", (_req, res) => {
  res.json(ok(metaConsoleStore.getSentHistory()));
});

export default router;
