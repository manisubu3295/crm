/**
 * Meta WhatsApp Cloud API webhook payload parser.
 *
 * Normalises the deeply-nested Meta webhook body into a flat, typed list
 * of events.  Handles all common payload shapes without throwing on
 * missing/unexpected fields.
 *
 * Supported event types:
 *   message_in     – incoming text, image, interactive, audio, …
 *   status_update  – delivered / read / failed / sent
 *   unknown        – anything else (reactions, other change fields, …)
 */

// ─── Types ────────────────────────────────────────────────────

export interface ParsedWebhookEvent {
  /** The entry.id from Meta (WhatsApp Business Account ID) */
  entryId?: string;
  /** change.field value, normally "messages" */
  changeField: string;

  eventType: "message_in" | "status_update" | "unknown";

  // message_in fields
  from?: string;
  wamid?: string;
  messageType?: string;
  messageBody?: string;
  timestamp?: string;

  // status_update fields
  statusType?: string;
  statusRecipient?: string;

  // shared
  to?: string; // phoneNumberId from metadata
  metadata?: { displayPhone?: string; phoneNumberId?: string };

  parseSuccess: boolean;
  warnings: string[];
}

// ─── Parser ───────────────────────────────────────────────────

/**
 * Parse a raw Meta webhook body into a list of normalised events.
 * Never throws — all errors are surfaced as warnings in the result.
 */
export function parseMetaWebhookPayload(body: unknown): ParsedWebhookEvent[] {
  if (!body || typeof body !== "object") {
    return [fail("root", ["Body is not an object"])];
  }

  const root = body as Record<string, unknown>;
  const warnings: string[] = [];

  if (root.object !== "whatsapp_business_account") {
    warnings.push(`Unexpected object type: ${String(root.object)}`);
  }

  const entries = Array.isArray(root.entry) ? root.entry : [];
  if (entries.length === 0) {
    return [fail("root", [...warnings, "No entry array found"])];
  }

  const results: ParsedWebhookEvent[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const entryObj = entry as Record<string, unknown>;
    const entryId = typeof entryObj.id === "string" ? entryObj.id : undefined;
    const changes = Array.isArray(entryObj.changes) ? entryObj.changes : [];

    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const changeObj = change as Record<string, unknown>;
      const field = typeof changeObj.field === "string" ? changeObj.field : "unknown";
      const value = changeObj.value as Record<string, unknown> | undefined;

      if (!value) {
        results.push(fail(field, ["Missing value in change"], entryId));
        continue;
      }

      // Extract metadata
      const meta = value.metadata as Record<string, unknown> | undefined;
      const parsedMeta = meta
        ? {
            displayPhone: meta.display_phone_number as string | undefined,
            phoneNumberId: meta.phone_number_id as string | undefined,
          }
        : undefined;

      let foundAny = false;

      // ── Incoming messages ─────────────────────────────────
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const msg of messages) {
        foundAny = true;
        const m = msg as Record<string, unknown>;
        const msgType = typeof m.type === "string" ? m.type : undefined;
        let bodyText: string | undefined;

        if (msgType === "text") {
          const t = m.text as Record<string, unknown> | undefined;
          bodyText = typeof t?.body === "string" ? t.body : undefined;
        } else if (msgType === "interactive") {
          const ia = m.interactive as Record<string, unknown> | undefined;
          const br = ia?.button_reply as Record<string, unknown> | undefined;
          const lr = ia?.list_reply as Record<string, unknown> | undefined;
          bodyText = (br?.title ?? lr?.title ?? "[interactive]") as string;
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
          from: typeof m.from === "string" ? m.from : undefined,
          wamid: typeof m.id === "string" ? m.id : undefined,
          messageType: msgType,
          messageBody: bodyText,
          timestamp: typeof m.timestamp === "string" ? m.timestamp : undefined,
          to: parsedMeta?.phoneNumberId,
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: [],
        });
      }

      // ── Status updates ────────────────────────────────────
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const stat of statuses) {
        foundAny = true;
        const s = stat as Record<string, unknown>;
        results.push({
          entryId,
          changeField: field,
          eventType: "status_update",
          wamid: typeof s.id === "string" ? s.id : undefined,
          statusType: typeof s.status === "string" ? s.status : undefined,
          statusRecipient: typeof s.recipient_id === "string" ? s.recipient_id : undefined,
          timestamp: typeof s.timestamp === "string" ? s.timestamp : undefined,
          from: parsedMeta?.phoneNumberId,
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: [],
        });
      }

      // ── Unrecognised change field ─────────────────────────
      if (!foundAny) {
        results.push({
          entryId,
          changeField: field,
          eventType: "unknown",
          metadata: parsedMeta,
          parseSuccess: true,
          warnings: [`Change field "${field}" contained no messages or statuses`],
        });
      }
    }
  }

  if (results.length === 0) {
    return [fail("root", ["No parseable content found"])];
  }

  return results;
}

// ─── Helper ───────────────────────────────────────────────────

function fail(
  field: string,
  warnings: string[],
  entryId?: string
): ParsedWebhookEvent {
  return { entryId, changeField: field, eventType: "unknown", parseSuccess: false, warnings };
}
