/**
 * SendMessage — send a real WhatsApp text or template message via Meta API.
 * Calls POST /api/internal/meta/messages/send.
 * Shows request payload preview before sending and full response after.
 */
import { useState, useMemo } from "react";
import { Send, Copy, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.js";
import { useSendMessage } from "../../hooks/useMetaConsole.js";
import type { MessageType } from "../../types/metaConsole.js";

// Phone: digits with optional leading + (country code required)
const PHONE_RE = /^\+?[1-9]\d{9,14}$/;

function JsonBlock({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200 font-mono leading-relaxed">
        {text}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}
        className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function SendMessage() {
  const { result, loading, error, send, reset } = useSendMessage();

  const [to, setTo]                   = useState("");
  const [type, setType]               = useState<MessageType>("template");
  const [body, setBody]               = useState("");
  const [templateName, setTemplate]   = useState("hello_world");
  const [lang, setLang]               = useState("en_US");
  const [showPreview, setShowPreview] = useState(false);

  const phoneError = to && !PHONE_RE.test(to) ? "Enter a valid number with country code (e.g. 918508716957)" : undefined;

  const isValid = to && !phoneError && (
    type === "text" ? body.trim().length > 0 : templateName.trim().length > 0
  );

  // Build preview payload (mirrors backend logic)
  const previewPayload = useMemo(() => {
    if (!to) return null;
    if (type === "text") {
      return { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body } };
    }
    return { messaging_product: "whatsapp", to, type: "template", template: { name: templateName, language: { code: lang } } };
  }, [to, type, body, templateName, lang]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    reset();
    send({ to, type, body: type === "text" ? body : undefined, templateName, languageCode: lang });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Send className="h-4 w-4 text-indigo-500" />
          Send Test Message
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          Sends a real message via Meta Graph API. Use your registered test number.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient + type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Recipient phone (with country code)</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value.replace(/\s/g, ""))}
                placeholder="918508716957"
              />
              {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Message type</Label>
              <Select value={type} onValueChange={(v) => { setType(v as MessageType); reset(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional fields */}
          {type === "text" && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Message body</Label>
              <textarea
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hello! This is a test message from the WhatsApp console."
              />
            </div>
          )}

          {type === "template" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Template name</Label>
                <Input value={templateName} onChange={(e) => setTemplate(e.target.value)} placeholder="hello_world" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Language code</Label>
                <Input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="en_US" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button type="submit" size="sm" disabled={!isValid || loading}>
              {loading ? "Sending…" : "Send via Meta API"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowPreview((p) => !p)}
              disabled={!to}
            >
              {showPreview ? "Hide" : "Preview"} Payload
            </Button>
          </div>
        </form>

        {/* Payload preview */}
        {showPreview && previewPayload && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Request Payload Preview</p>
            <JsonBlock data={previewPayload} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-md border px-4 py-3 space-y-3 ${result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2">
              {result.success
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <XCircle className="h-4 w-4 text-red-600" />}
              <span className={`text-sm font-semibold ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                {result.success ? "Message Sent" : "Send Failed"}
              </span>
              {result.messageId && (
                <code className="ml-auto text-xs font-mono text-slate-500 truncate max-w-xs">{result.messageId}</code>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Meta Response</p>
              <JsonBlock data={result.metaResponse} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
