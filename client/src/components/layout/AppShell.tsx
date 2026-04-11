import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Sidebar, MobileMenuButton } from "./Sidebar.js";
import { useSocket } from "../../hooks/useSocket.js";
import { cn } from "../../lib/utils.js";

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

const COLLAPSED_KEY = "crm_sidebar_collapsed";

export function AppShell({ children, title }: AppShellProps) {
  useSocket();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    <div className="flex min-h-screen bg-muted/20">
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
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div className={cn(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-200",
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
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center border-b border-border/60 bg-background/80 backdrop-blur-sm px-6">
          <div className={cn("flex items-center gap-3", isMobile && "pl-10")}>
            {title && (
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h1>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
