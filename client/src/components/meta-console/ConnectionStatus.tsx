/**
 * ConnectionStatus — shows the current Meta/WhatsApp Cloud API config state.
 * Fetches from GET /api/internal/meta/status and displays masked env values.
 */
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Badge } from "../ui/badge.js";
import { Button } from "../ui/button.js";
import { useMetaStatus } from "../../hooks/useMetaConsole.js";
import type { MetaConfigStatus } from "../../types/metaConsole.js";

// ─── Status badge ─────────────────────────────────────────────

function OverallBadge({ status }: { status: MetaConfigStatus["overallStatus"] }) {
  if (status === "ready")
    return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
  if (status === "partial")
    return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" /> Partial</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Not Configured</Badge>;
}

// ─── Individual field row ─────────────────────────────────────

function ConfigRow({
  label,
  present,
  maskedValue,
}: {
  label: string;
  present: boolean;
  maskedValue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        {maskedValue && (
          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
            {maskedValue}
          </code>
        )}
        {present ? (
          <Badge variant="success">Set</Badge>
        ) : (
          <Badge variant="destructive">Missing</Badge>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────

export function ConnectionStatus() {
  const { status, loading, error, refresh } = useMetaStatus();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Radio className="h-4 w-4 text-indigo-500" />
          Connection Status
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="ml-1.5">Refresh</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !status && (
          <div className="text-sm text-slate-400 py-4 text-center">Loading…</div>
        )}

        {status && (
          <>
            {/* Overall badge */}
            <div className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-200 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">Overall Status</span>
              <OverallBadge status={status.overallStatus} />
            </div>

            {/* Meta fields */}
            <div className="rounded-md border border-slate-200 px-4 divide-y divide-slate-100">
              <ConfigRow label="Access Token"    present={status.hasAccessToken}   maskedValue={status.maskedAccessToken} />
              <ConfigRow label="Phone Number ID" present={status.hasPhoneNumberId} maskedValue={status.maskedPhoneNumberId} />
              <ConfigRow label="App Secret"      present={status.hasAppSecret}     maskedValue={status.maskedAppSecret} />
              <ConfigRow label="Verify Token"    present={status.hasVerifyToken}   maskedValue={status.maskedVerifyToken} />
            </div>

            {/* Meta-info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <InfoTile label="API Version"      value={status.apiVersion} />
              <InfoTile label="Environment"      value={status.environment} />
              <InfoTile label="Webhook Endpoint" value={status.webhookEndpoint} mono />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-medium text-slate-800 truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
