import { useState } from "react";
import { Send, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button.js";
import { Input }  from "../components/ui/input.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { AppShell } from "../components/layout/AppShell.js";
import { getAuthHeaders } from "../lib/queryClient.js";

const DEFAULT_TO   = "918508716957";
const DEFAULT_TPL  = "hello_world";
const DEFAULT_LANG = "en_US";

export function DevWhatsAppPage() {
  const [to,           setTo]           = useState(DEFAULT_TO);
  const [templateName, setTemplateName] = useState(DEFAULT_TPL);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANG);
  const [loading,      setLoading]      = useState(false);
  const [response,     setResponse]     = useState<object | null>(null);

  async function handleSend() {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/dev/whatsapp-send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ to, templateName, languageCode }),
      });
      const data = await res.json();
      setResponse(data);
      if (data.ok) {
        toast.success("Message sent — check the recipient's WhatsApp");
      } else {
        toast.error("Meta returned an error — see response below");
      }
    } catch (err) {
      toast.error("Request failed — is the server running?");
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="[Dev] WhatsApp Tester">
      <div className="p-6 max-w-2xl">
        {/* Dev mode banner */}
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          <Terminal className="h-4 w-4 shrink-0" />
          <span>
            <strong>Dev mode only</strong> — this page is not mounted in production.
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              Send WhatsApp Test Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Recipient phone (with country code)
              </label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="918508716957"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Template name
              </label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="hello_world"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Language code
              </label>
              <Input
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                placeholder="en_US"
              />
            </div>

            <Button onClick={handleSend} disabled={loading} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {loading ? "Sending…" : "Send via Meta Graph API"}
            </Button>

            {response && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Meta Response
                </p>
                <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
