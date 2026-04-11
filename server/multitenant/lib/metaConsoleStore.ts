/**
 * In-memory store for the Meta WhatsApp Test Console.
 * Holds recent webhook logs and sent-message history for debugging.
 * Both lists are capped at MAX_ENTRIES (FIFO drop of oldest).
 *
 * This module is a singleton — the same instance is shared by:
 *   - metaConsole routes  (read / clear)
 *   - webhooks router      (write on real inbound event)
 */
import { randomUUID } from "crypto";

// ─── Webhook log ──────────────────────────────────────────────

export interface WebhookLogEntry {
  id: string;
  receivedAt: string;
  source: "real" | "simulated";
  eventType: string;
  from?: string;
  messageType?: string;
  preview?: string;
  /** "received" → stored but not parsed, "parsed" → parsed OK, "error" → parse failure */
  status: "received" | "parsed" | "error";
  rawPayload: unknown;
  parsedEntries: unknown[];
}

// ─── Sent-message history ─────────────────────────────────────

export interface SentMessageEntry {
  id: string;
  sentAt: string;
  to: string;
  type: "text" | "template";
  preview: string;
  success: boolean;
  requestPayload: unknown;
  metaResponse?: unknown;
  error?: string;
}

// ─── Store class ──────────────────────────────────────────────

const MAX_ENTRIES = 200;

class MetaConsoleStore {
  private webhookLogs: WebhookLogEntry[] = [];
  private sentHistory: SentMessageEntry[] = [];

  addWebhookLog(entry: Omit<WebhookLogEntry, "id" | "receivedAt">): WebhookLogEntry {
    const full: WebhookLogEntry = {
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      ...entry,
    };
    this.webhookLogs.unshift(full); // newest first
    if (this.webhookLogs.length > MAX_ENTRIES) this.webhookLogs.pop();
    return full;
  }

  getWebhookLogs(): WebhookLogEntry[] {
    return [...this.webhookLogs];
  }

  clearWebhookLogs(): void {
    this.webhookLogs = [];
  }

  addSentMessage(entry: Omit<SentMessageEntry, "id" | "sentAt">): SentMessageEntry {
    const full: SentMessageEntry = {
      id: randomUUID(),
      sentAt: new Date().toISOString(),
      ...entry,
    };
    this.sentHistory.unshift(full); // newest first
    if (this.sentHistory.length > MAX_ENTRIES) this.sentHistory.pop();
    return full;
  }

  getSentHistory(): SentMessageEntry[] {
    return [...this.sentHistory];
  }

  clearSentHistory(): void {
    this.sentHistory = [];
  }
}

export const metaConsoleStore = new MetaConsoleStore();
