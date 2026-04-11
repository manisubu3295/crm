/**
 * WebhookLogs — live-refreshable table of received webhook events.
 * Fetches from GET /api/internal/meta/webhook/logs.
 * Supports expand, copy, filter by type, and search by phone / text.
 */
import { useState, useMemo } from "react";
import { RefreshCw, Trash2, Copy, ChevronDown, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Badge } from "../ui/badge.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { useWebhookLogs } from "../../hooks/useMetaConsole.js";
import type { WebhookLogEntry } from "../../types/metaConsole.js";

// ─── Helpers ──────────────────────────────────────────────────

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

function EventTypeBadge({ type }: { type: string }) {
  if (type === "message_in")   return <Badge variant="indigo">Message In</Badge>;
  if (type === "status_update") return <Badge variant="cyan">Status Update</Badge>;
  return <Badge variant="default">Unknown</Badge>;
}

function SourceBadge({ source }: { source: "real" | "simulated" }) {
  return source === "simulated"
    ? <Badge variant="warning">Simulated</Badge>
    : <Badge variant="success">Real</Badge>;
}

// ─── Expanded row ─────────────────────────────────────────────

function ExpandedRow({ entry }: { entry: WebhookLogEntry }) {
  const raw = JSON.stringify(entry.rawPayload, null, 2);
  const copyRaw = () => { navigator.clipboard.writeText(raw); toast.success("Copied"); };

  return (
    <tr className="bg-slate-50">
      <td colSpan={7} className="px-4 py-3 space-y-3">
        {/* Parsed events summary */}
        {entry.parsedEntries.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Parsed Events</p>
            <div className="space-y-1">
              {entry.parsedEntries.map((ev, i) => (
                <div key={i} className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <span><span className="text-slate-400">type: </span>{ev.eventType}</span>
                  {ev.from && <span><span className="text-slate-400">from: </span>{ev.from}</span>}
                  {ev.wamid && <span className="sm:col-span-2 truncate"><span className="text-slate-400">wamid: </span>{ev.wamid}</span>}
                  {ev.messageBody && <span className="sm:col-span-4"><span className="text-slate-400">body: </span>{ev.messageBody}</span>}
                  {ev.statusType && <span><span className="text-slate-400">status: </span>{ev.statusType}</span>}
                  {ev.warnings.length > 0 && (
                    <span className="sm:col-span-4 text-amber-600">⚠ {ev.warnings.join(", ")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw payload */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Raw Payload</p>
            <button
              onClick={copyRaw}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-200 font-mono leading-relaxed max-h-64">
            {raw}
          </pre>
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────

export function WebhookLogs() {
  const { logs, loading, error, refresh, clearLogs } = useWebhookLogs();

  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch]         = useState("");

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = logs;
    if (filterType !== "all") list = list.filter((l) => l.eventType === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.from?.includes(q) ||
          l.preview?.toLowerCase().includes(q) ||
          l.eventType.includes(q)
      );
    }
    return list;
  }, [logs, filterType, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            Webhook Event Logs
            {logs.length > 0 && (
              <span className="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {logs.length}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1">Refresh</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="ml-1">Clear</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search phone or message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="message_in">Message In</SelectItem>
              <SelectItem value="status_update">Status Update</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {error && (
          <div className="px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {logs.length === 0 ? "No events received yet." : "No events match your filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Preview</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="px-3 py-2.5 text-slate-400">
                        {expanded.has(entry.id)
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">
                        {fmtTime(entry.receivedAt)}
                      </td>
                      <td className="px-3 py-2.5"><EventTypeBadge type={entry.eventType} /></td>
                      <td className="px-3 py-2.5"><SourceBadge source={entry.source} /></td>
                      <td className="px-3 py-2.5 text-xs font-mono text-slate-600">{entry.from ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{entry.messageType ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">
                        {entry.preview ?? "—"}
                      </td>
                    </tr>
                    {expanded.has(entry.id) && <ExpandedRow key={`${entry.id}-exp`} entry={entry} />}
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
