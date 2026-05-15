import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Sidebar, MobileMenuButton } from "./Sidebar.js";
import { useSocket } from "../../hooks/useSocket.js";
import { cn } from "../../lib/utils.js";
import { HelpCircle } from "lucide-react";
import { UserGuide } from "../guide/UserGuide.js";
import { useAuth } from "../../lib/auth.js";
import { NotificationBell } from "../notifications/NotificationBell.js";

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

const COLLAPSED_KEY = "crm_sidebar_collapsed";

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export function AppShell({ children, title }: AppShellProps) {
  useSocket();
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch {}
  };

  const sidebarWidth = collapsed ? "72px" : "260px";

  return (
    <div className="relative flex min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(25,118,210,0.08),transparent_36%),radial-gradient(circle_at_86%_84%,rgba(2,136,209,0.08),transparent_38%)]" />
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={toggleCollapse} />
      )}

      {/* Mobile sidebar + overlay */}
      {isMobile && (
        <>
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          {mobileOpen && (
            <div
              className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div className={cn(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div
        className="flex flex-1 flex-col min-h-screen transition-all duration-200"
        style={!isMobile ? { marginLeft: sidebarWidth } : undefined}
      >
        {/* ── Premium Top Header ── */}
        <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center bg-white/95 backdrop-blur-sm px-5 gap-4 border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {/* Left: accent bar + title */}
          <div className={cn("flex items-center gap-3 flex-1 min-w-0", isMobile && "pl-10")}>
            {title && (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-5 w-[3px] rounded-full bg-[#1976D2] shrink-0" />
                <h1 className="text-[15px] font-semibold text-foreground tracking-tight truncate">
                  {title}
                </h1>
              </div>
            )}
          </div>

          {/* Right: date · help · notifications · avatar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:block text-[11px] font-medium text-muted-foreground/60 mr-2 tabular-nums">
              {formatDate()}
            </span>

            <button
              onClick={() => setShowGuide(true)}
              title="Open User Guide"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <NotificationBell />

            {/* User avatar */}
            {user && (
              <div
                title={user.fullName}
                className="ml-1 flex h-8 w-8 cursor-default items-center justify-center rounded-full bg-[#1976D2] text-xs font-bold text-white shadow-sm shrink-0 ring-2 ring-blue-100"
              >
                {user.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </header>

        {/* Gradient separator */}
        <div className="h-px shrink-0 bg-slate-200" />

        {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}

        {/* Page content */}
        <main className="crm-reveal flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
