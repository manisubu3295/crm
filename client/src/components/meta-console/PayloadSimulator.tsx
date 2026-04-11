/**
 * PayloadSimulator — load, edit, and simulate Meta webhook payloads locally.
 * Injects the payload through the same parser the real webhook uses.
 * Shows normalized ParsedWebhookEvent output in a debug panel.
 *
 * Calls POST /api/internal/meta/webhook/simulate.
 */
import { useState } from "react";
import { FlaskConical, Play, Copy, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Badge } from "../ui/badge.js";
import { useSimulatePayload } from "../../hooks/useMetaConsole.js";
import { SAMPLE_PAYLOADS } from "../../types/metaConsole.js";

// ─── Sample button labels ─────────────────────────────────────

const SAMPLES: Array<{ key: keyof typeof SAMPLE_PAYLOADS; label: string }> = [
  { key: "incomingText",   label: "Incoming Text" },
  { key: "deliveryStatus", label: "Delivery Status" },
  { key: "readStatus",     label: "Read Status" },
  { key: "failedStatus",   label: "Failed Status" },
  { key: "unsupported",    label: "Unsupported (Reaction)" },
];

// ─── Helpers ──────────────────────────────────────────────────

function tryParseJson(text: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try { return { ok: true, data: JSON.parse(text) }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }; }
}

// ─── ParsedResultPanel (inline) ──────────────────────────────

function ParsedResultPanel({ result }: { result: ReturnType<typeof useSimulatePayload>["result"] }) {
  if (!result) return null;

  const copy = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success("Copied");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {result.errors && result.errors.length > 0
          ? <XCircle className="h-4 w-4 text-red-600" />
          : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        <span className={`text-sm font-semibold ${result.errors?.length ? "text-red-700" : "text-emerald-700"}`}>
          {result.errors?.length ? "Parse Failed" : "Simulated & Parsed"}
        </span>
        <code className="ml-auto text-[11px] font-mono text-slate-500">log: {result.logId.slice(0, 8)}</code>
      </div>

      {result.errors?.map((err, i) => (
        <div key={i} className="flex items-start gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {err}
        </div>
      ))}

      {result.parsedEntries.map((ev, i) => (
        <div key={i} className="rounded-md border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Event #{i + 1}</span>
            <div className="flex items-center gap-1.5">
              {ev.eventType === "message_in"    && <Badge variant="indigo">Message In</Badge>}
              {ev.eventType === "status_update"  && <Badge variant="cyan">Status Update</Badge>}
              {ev.eventType === "unknown"        && <Badge variant="default">Unknown</Badge>}
              {ev.parseSuccess
                ? <Badge variant="success">Parsed</Badge>
                : <Badge variant="destructive">Parse Error</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 px-4 py-3 text-xs">
            {[
              ["Change field", ev.changeField],
              ["From",         ev.from],
              ["To (phone ID)", ev.to],
              ["WAMID",        ev.wamid],
              ["Message type", ev.messageType],
              ["Status",       ev.statusType],
              ["Recipient",    ev.statusRecipient],
              ["Timestamp",    ev.timestamp],
              ["Phone number", ev.metadata?.displayPhone],
              ["Phone ID",     ev.metadata?.phoneNumberId],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label}>
                  <span className="text-slate-400">{label}: </span>
                  <span className="font-mono text-slate-700">{value}</span>
                </div>
              ))}
          </div>

          {ev.messageBody && (
            <div className="border-t border-slate-100 px-4 py-2">
              <span className="text-xs text-slate-400">Body: </span>
              <span className="text-xs text-slate-700">{ev.messageBody}</span>
            </div>
          )}

          {ev.warnings.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 space-y-1">
              {ev.warnings.map((w, wi) => (
                <div key={wi} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {w}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Full JSON output */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Full Parsed JSON</p>
          <button
            onClick={() => copy(result.parsedEntries)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-200 font-mono leading-relaxed max-h-60">
          {JSON.stringify(result.parsedEntries, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function PayloadSimulator() {
  const { result, loading, error, simulate, reset } = useSimulatePayload();
  const [jsonText, setJsonText] = useState(
    JSON.stringify(SAMPLE_PAYLOADS.incomingText, null, 2)
  );

  const parsed = tryParseJson(jsonText);

  function loadSample(key: keyof typeof SAMPLE_PAYLOADS) {
    reset();
    setJsonText(JSON.stringify(SAMPLE_PAYLOADS[key], null, 2));
  }

  function handleSimulate() {
    if (!parsed.ok) return;
    simulate(parsed.data);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <FlaskConical className="h-4 w-4 text-indigo-500" />
          Local Payload Simulator
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          Load a sample payload, edit the JSON, then simulate it through the backend parser without calling Meta.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sample buttons */}
        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => loadSample(key)}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* JSON editor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payload JSON</p>
            {!parsed.ok && (
              <span className="text-[11px] text-red-500">{parsed.error}</span>
            )}
          </div>
          <textarea
            className={`w-full rounded-md border font-mono text-xs bg-slate-900 text-slate-200 p-3 resize-y leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              !parsed.ok ? "border-red-400" : "border-slate-700"
            }`}
            rows={14}
            value={jsonText}
            onChange={(e) => { reset(); setJsonText(e.target.value); }}
            spellCheck={false}
          />
        </div>

        <Button
          size="sm"
          onClick={handleSimulate}
          disabled={!parsed.ok || loading}
          className="gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          {loading ? "Simulating…" : "Simulate Payload"}
        </Button>

        {error && (
          <div className="flex items-start gap-2 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {result && <ParsedResultPanel result={result} />}
      </CardContent>
    </Card>
  );
}
