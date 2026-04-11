/**
 * TypeScript interfaces shared across all Meta Console components and hooks.
 */

// ─── Config status ────────────────────────────────────────────

export interface MetaConfigStatus {
  apiVersion: string;
  environment: string;
  webhookEndpoint: string;
  overallStatus: "ready" | "partial" | "not_configured";

  hasAccessToken: boolean;
  hasPhoneNumberId: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;

  // Masked (last 4 chars) — safe to display
  maskedAccessToken?: string;
  maskedAppSecret?: string;
  maskedPhoneNumberId?: string;
  maskedVerifyToken?: string;
}

// ─── Webhook verify test ──────────────────────────────────────

export interface VerifyTestRequest {
  mode: string;
  verifyToken: string;
  challenge: string;
}

export interface VerifyTestResult {
  passed: boolean;
  httpStatus: number;
  responseBody: string | null;
  explanation: string;
  checks: { modeMatch: boolean; tokenMatch: boolean };
}

// ─── Send message ─────────────────────────────────────────────

export type MessageType = "text" | "template";

export interface SendMessageRequest {
  to: string;
  type: MessageType;
  body?: string;        // text message
  templateName?: string;
  languageCode?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  metaResponse: unknown;
  requestPayload: unknown;
}

// ─── Webhook events (parsed) ──────────────────────────────────

export interface ParsedWebhookEvent {
  entryId?: string;
  changeField: string;
  eventType: "message_in" | "status_update" | "unknown";
  from?: string;
  to?: string;
  wamid?: string;
  messageType?: string;
  messageBody?: string;
  statusType?: string;
  statusRecipient?: string;
  timestamp?: string;
  metadata?: { displayPhone?: string; phoneNumberId?: string };
  parseSuccess: boolean;
  warnings: string[];
}

// ─── Webhook log entry ────────────────────────────────────────

export interface WebhookLogEntry {
  id: string;
  receivedAt: string;
  source: "real" | "simulated";
  eventType: string;
  from?: string;
  messageType?: string;
  preview?: string;
  status: "received" | "parsed" | "error";
  rawPayload: unknown;
  parsedEntries: ParsedWebhookEvent[];
}

// ─── Sent message history ─────────────────────────────────────

export interface SentMessageEntry {
  id: string;
  sentAt: string;
  to: string;
  type: MessageType;
  preview: string;
  success: boolean;
  requestPayload: unknown;
  metaResponse?: unknown;
  error?: string;
}

// ─── Payload simulation result ────────────────────────────────

export interface SimulateResult {
  source: "simulated";
  logId: string;
  parsedEntries: ParsedWebhookEvent[];
  errors?: string[];
}

// ─── API response wrapper ─────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  message?: string;
}

// ─── Sample payloads for the simulator ───────────────────────

const ts = () => Math.floor(Date.now() / 1000).toString();

export const SAMPLE_PAYLOADS: Record<string, unknown> = {
  incomingText: {
    object: "whatsapp_business_account",
    entry: [{
      id: "102289599326025",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001234", phone_number_id: "123456789" },
          contacts: [{ profile: { name: "Test User" }, wa_id: "918508716957" }],
          messages: [{
            from: "918508716957",
            id: "wamid.HBgMSampleIncoming==",
            timestamp: ts(),
            text: { body: "Hello, I am interested in your courses." },
            type: "text",
          }],
        },
        field: "messages",
      }],
    }],
  },

  deliveryStatus: {
    object: "whatsapp_business_account",
    entry: [{
      id: "102289599326025",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001234", phone_number_id: "123456789" },
          statuses: [{
            id: "wamid.HBgMSampleDelivered==",
            status: "delivered",
            timestamp: ts(),
            recipient_id: "918508716957",
          }],
        },
        field: "messages",
      }],
    }],
  },

  readStatus: {
    object: "whatsapp_business_account",
    entry: [{
      id: "102289599326025",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001234", phone_number_id: "123456789" },
          statuses: [{
            id: "wamid.HBgMSampleRead==",
            status: "read",
            timestamp: ts(),
            recipient_id: "918508716957",
          }],
        },
        field: "messages",
      }],
    }],
  },

  failedStatus: {
    object: "whatsapp_business_account",
    entry: [{
      id: "102289599326025",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001234", phone_number_id: "123456789" },
          statuses: [{
            id: "wamid.HBgMSampleFailed==",
            status: "failed",
            timestamp: ts(),
            recipient_id: "918508716957",
            errors: [{ code: 131047, title: "Re-engagement message" }],
          }],
        },
        field: "messages",
      }],
    }],
  },

  unsupported: {
    object: "whatsapp_business_account",
    entry: [{
      id: "102289599326025",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "15550001234", phone_number_id: "123456789" },
          messages: [{
            from: "918508716957",
            id: "wamid.HBgMUnsupported==",
            timestamp: ts(),
            type: "reaction",
            reaction: { message_id: "wamid.HBgMParent==", emoji: "\uD83D\uDC4D" },
          }],
        },
        field: "messages",
      }],
    }],
  },
};
