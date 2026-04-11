/**
 * API hooks for the Meta WhatsApp Test Console.
 *
 * Each hook manages its own loading / error / data state.
 * All calls go to /api/internal/meta/* (dev-only backend routes).
 */
import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "../lib/queryClient.js";
import type {
  ApiResponse,
  MetaConfigStatus,
  VerifyTestRequest,
  VerifyTestResult,
  SendMessageRequest,
  SendMessageResult,
  WebhookLogEntry,
  SentMessageEntry,
  SimulateResult,
} from "../types/metaConsole.js";

// ─── Base fetch helper ────────────────────────────────────────

async function api<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // Always return JSON; the backend returns { ok, data?, message? }
  return res.json() as Promise<ApiResponse<T>>;
}

// ─── useMetaStatus ────────────────────────────────────────────

export function useMetaStatus() {
  const [status, setStatus]   = useState<MetaConfigStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<MetaConfigStatus>("GET", "/api/internal/meta/status");
      if (res.ok && res.data) setStatus(res.data);
      else setError(res.message ?? "Failed to fetch status");
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, error, refresh };
}

// ─── useWebhookVerify ─────────────────────────────────────────

export function useWebhookVerify() {
  const [result, setResult]   = useState<VerifyTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const test = useCallback(async (payload: VerifyTestRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<VerifyTestResult>(
        "POST",
        "/api/internal/meta/webhook/verify-test",
        payload
      );
      if (res.ok !== undefined && res.data) setResult(res.data);
      else setError(res.message ?? "Verification test failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, test, reset };
}

// ─── useSendMessage ───────────────────────────────────────────

export function useSendMessage() {
  const [result, setResult]   = useState<SendMessageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const send = useCallback(async (payload: SendMessageRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<SendMessageResult>(
        "POST",
        "/api/internal/meta/messages/send",
        payload
      );
      if (res.data) setResult(res.data);
      if (!res.ok) setError(res.message ?? "Send failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, send, reset };
}

// ─── useWebhookLogs ───────────────────────────────────────────

export function useWebhookLogs() {
  const [logs, setLogs]       = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<WebhookLogEntry[]>("GET", "/api/internal/meta/webhook/logs");
      if (res.ok && res.data) setLogs(res.data);
      else setError(res.message ?? "Failed to fetch logs");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLogs = useCallback(async () => {
    await api("DELETE", "/api/internal/meta/webhook/logs");
    setLogs([]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { logs, loading, error, refresh, clearLogs };
}

// ─── useSimulatePayload ───────────────────────────────────────

export function useSimulatePayload() {
  const [result, setResult]   = useState<SimulateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const simulate = useCallback(async (payload: unknown) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<SimulateResult>(
        "POST",
        "/api/internal/meta/webhook/simulate",
        payload
      );
      if (res.data) setResult(res.data);
      if (!res.ok) setError(res.message ?? "Simulation failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, simulate, reset };
}

// ─── useMessageHistory ────────────────────────────────────────

export function useMessageHistory() {
  const [history, setHistory] = useState<SentMessageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<SentMessageEntry[]>("GET", "/api/internal/meta/messages/history");
      if (res.ok && res.data) setHistory(res.data);
      else setError(res.message ?? "Failed to fetch history");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { history, loading, error, refresh };
}
