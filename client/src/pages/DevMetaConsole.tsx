/**
 * WhatsApp Integration Test Console
 *
 * Internal dev screen — route: /dev/meta-console
 * Only mounted in development (see App.tsx).
 *
 * Tabs:
 *   1. Status     — connection config status
 *   2. Verify     — simulate webhook GET verification
 *   3. Send       — send text or template message
 *   4. Logs       — live webhook event log
 *   5. Simulate   — local payload injection & parsing
 *   6. History    — messages sent from this console
 *   7. Notes      — static developer guidance
 */
import { Terminal, BookOpen } from "lucide-react";
import { AppShell } from "../components/layout/AppShell.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { ConnectionStatus }  from "../components/meta-console/ConnectionStatus.js";
import { WebhookVerifier }   from "../components/meta-console/WebhookVerifier.js";
import { SendMessage }        from "../components/meta-console/SendMessage.js";
import { WebhookLogs }        from "../components/meta-console/WebhookLogs.js";
import { PayloadSimulator }   from "../components/meta-console/PayloadSimulator.js";
import { MessageHistory }     from "../components/meta-console/MessageHistory.js";

// ─── Developer notes ──────────────────────────────────────────

const NOTES = [
  {
    title: "Internal testing only",
    body: "This screen is for backend integration verification during development. It is not mounted in production builds.",
  },
  {
    title: "Secrets stay in the backend",
    body: "META_ACCESS_TOKEN, META_APP_SECRET, META_PHONE_NUMBER_ID, and META_VERIFY_TOKEN live in .env on the server. They are never sent to the browser — only masked tails are shown.",
  },
  {
    title: "Meta cannot reach localhost",
    body: "Real webhook events from Meta require a public HTTPS URL. Use a tunnel (ngrok, Cloudflare Tunnel, etc.) and set the callback URL in your Meta App → WhatsApp → Configuration → Webhook.",
  },
  {
    title: "Test number sandbox limits",
    body: "The Meta test number can only message recipients who have opted in via the developer dashboard. You can add up to 5 test recipients.",
  },
  {
    title: "Template messages",
    body: "Only pre-approved templates can be sent to non-sandbox numbers. Use hello_world for initial testing. All custom templates require Meta review.",
  },
  {
    title: "Production requirements",
    body: "For production: (1) complete Meta Business Verification, (2) get a real phone number approved, (3) have templates approved, (4) use a permanent System User access token — not a temporary one.",
  },
  {
    title: "API version",
    body: "Currently configured to use v25.0. Meta deprecates old versions — v19.0 ends May 21 2026. Always use the current version for new integrations.",
  },
];

function DeveloperNotes() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <BookOpen className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm font-medium text-amber-800">
          Developer Reference — Static Guidelines
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {NOTES.map((note) => (
          <div key={note.title} className="rounded-md border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-700 mb-1">{note.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{note.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export function DevMetaConsolePage() {
  return (
    <AppShell title="WhatsApp Integration Test Console">
      <div className="p-4 sm:p-6 max-w-6xl space-y-4">
        {/* Dev-mode banner */}
        <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
          <Terminal className="h-4 w-4 shrink-0" />
          <span>
            <strong>Internal Tool</strong> — dev mode only. Not visible or accessible in production.
          </span>
        </div>

        {/* Main tabbed interface */}
        <Tabs defaultValue="status">
          <TabsList className="flex-wrap h-auto gap-1 bg-slate-100">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="verify">Verify Webhook</TabsTrigger>
            <TabsTrigger value="send">Send Message</TabsTrigger>
            <TabsTrigger value="logs">Webhook Logs</TabsTrigger>
            <TabsTrigger value="simulate">Simulate Payload</TabsTrigger>
            <TabsTrigger value="history">Message History</TabsTrigger>
            <TabsTrigger value="notes">Dev Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="status"   className="mt-4"><ConnectionStatus /></TabsContent>
          <TabsContent value="verify"   className="mt-4"><WebhookVerifier /></TabsContent>
          <TabsContent value="send"     className="mt-4"><SendMessage /></TabsContent>
          <TabsContent value="logs"     className="mt-4"><WebhookLogs /></TabsContent>
          <TabsContent value="simulate" className="mt-4"><PayloadSimulator /></TabsContent>
          <TabsContent value="history"  className="mt-4"><MessageHistory /></TabsContent>
          <TabsContent value="notes"    className="mt-4"><DeveloperNotes /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
