/**
 * WebhookVerifier — simulate Meta's GET webhook verification request locally.
 * Calls POST /api/internal/meta/webhook/verify-test.
 */
import { useState } from "react";
import { ShieldCheck, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import { useWebhookVerify } from "../../hooks/useMetaConsole.js";

export function WebhookVerifier() {
  const { result, loading, error, test, reset } = useWebhookVerify();

  const [form, setForm] = useState({
    mode: "subscribe",
    verifyToken: "",
    challenge: "test_challenge_12345",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.verifyToken.trim()) return;
    test({ mode: form.mode, verifyToken: form.verifyToken, challenge: form.challenge });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          Webhook Verification Tester
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          Simulate the GET request Meta sends when you click "Verify" in the developer dashboard.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">hub.mode</Label>
              <Input
                value={form.mode}
                onChange={(e) => set("mode", e.target.value)}
                placeholder="subscribe"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">hub.verify_token</Label>
              <Input
                value={form.verifyToken}
                onChange={(e) => set("verifyToken", e.target.value)}
                placeholder="your META_VERIFY_TOKEN"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">hub.challenge</Label>
              <Input
                value={form.challenge}
                onChange={(e) => set("challenge", e.target.value)}
                placeholder="any_string"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading || !form.verifyToken.trim()}>
              {loading ? "Testing…" : "Test Verification Locally"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { reset(); setForm({ mode: "subscribe", verifyToken: "", challenge: "test_challenge_12345" }); }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className={`rounded-md border px-4 py-3 space-y-2 ${result.passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2">
              {result.passed
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <XCircle className="h-4 w-4 text-red-600" />}
              <span className={`text-sm font-semibold ${result.passed ? "text-emerald-700" : "text-red-700"}`}>
                {result.passed ? "Verification Passed" : "Verification Failed"}
              </span>
              <span className="ml-auto text-xs font-mono text-slate-500">
                HTTP {result.httpStatus}
              </span>
            </div>
            <p className="text-xs text-slate-600">{result.explanation}</p>
            {result.responseBody !== null && (
              <div className="mt-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Response body</p>
                <code className="block mt-1 rounded bg-white border border-slate-200 px-2 py-1 text-xs font-mono text-slate-700">
                  {result.responseBody}
                </code>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
