/**
 * MessageHistory — shows messages sent from this test console.
 * Fetches from GET /api/internal/meta/messages/history.
 */
import { useState } from "react";
import { RefreshCw, ChevronDown, ChevronRight, Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Badge } from "../ui/badge.js";
import { useMessageHistory } from "../../hooks/useMetaConsole.js";
import type { SentMessageEntry } from "../../types/metaConsole.js";

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function ExpandedSent({ entry }: { entry: SentMessageEntry }) {
  const copy = (d: unknown) => { navigator.clipboard.writeText(JSON.stringify(d, null, 2)); toast.success("Copied"); };
  return (
    <tr className="bg-slate-50">
      <td colSpan={6} className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Request Payload</p>
            <div className="relative">
              <pre className="overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-200 font-mono max-h-48">
                {JSON.stringify(entry.requestPayload, null, 2)}
              </pre>
              <button onClick={() => copy(entry.requestPayload)} className="absolute right-2 top-2 text-slate-500 hover:text-slate-200">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Meta Response</p>
            <div className="relative">
              <pre className="overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-200 font-mono max-h-48">
                {JSON.stringify(entry.metaResponse, null, 2)}
              </pre>
              <button onClick={() => copy(entry.metaResponse)} className="absolute right-2 top-2 text-slate-500 hover:text-slate-200">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        {entry.error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{entry.error}</div>
        )}
      </td>
    </tr>
  );
}

export function MessageHistory() {
  const { history, loading, error, refresh } = useMessageHistory();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Test Message History
            {history.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {history.length}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="ml-1">Refresh</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}

        {history.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No messages sent yet. Use "Send Test Message" to start.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Preview</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggle(entry.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-400">
                        {expanded.has(entry.id)
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {fmtTime(entry.sentAt)}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-700">{entry.to}</td>
                      <td className="px-3 py-2.5">
                        <Badge variant={entry.type === "template" ? "indigo" : "default"}>
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[220px] truncate">
                        {entry.preview}
                      </td>
                      <td className="px-3 py-2.5">
                        {entry.success
                          ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Sent</span>
                          : <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle className="h-3.5 w-3.5" />Failed</span>}
                      </td>
                    </tr>
                    {expanded.has(entry.id) && <ExpandedSent key={`${entry.id}-exp`} entry={entry} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
