import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CheckSquare, Megaphone,
  BarChart2, Settings, Zap, MessageSquare, RefreshCw,
  LogOut, User, ChevronRight, ChevronLeft, Menu, FlaskConical,
  GraduationCap, TrendingUp, CreditCard, Building2, BookOpen,
  ClipboardCheck, FileText, Trophy, BookMarked, Briefcase,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import { useAuth } from "../../lib/auth.js";
import { NotificationBell } from "../notifications/NotificationBell.js";

const NAV_SECTIONS = [
  {
    title: "MAIN",
    items: [
      { href: "/",           icon: LayoutDashboard, label: "Dashboard" },
      { href: "/leads",      icon: Users,           label: "Leads" },
      { href: "/students",   icon: GraduationCap,   label: "Students" },
      { href: "/followups",  icon: CheckSquare,     label: "Follow-Ups" },
    ],
  },
  {
    title: "ENGAGEMENT",
    items: [
      { href: "/pipeline",    icon: TrendingUp,  label: "Pipeline" },
      { href: "/campaigns",   icon: Megaphone,   label: "Campaigns" },
      { href: "/automation",  icon: Zap,         label: "Automation" },
      { href: "/reengagement",icon: RefreshCw,   label: "Re-engagement" },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { href: "/reports",     icon: BarChart2, label: "Reports" },
      { href: "/leaderboard", icon: Trophy,    label: "Leaderboard" },
      { href: "/settings",   icon: Settings,  label: "Settings" },
    ],
  },
  {
    title: "REVENUE",
    items: [
      { href: "/payments",  icon: CreditCard,  label: "Payments" },
      { href: "/companies", icon: Building2,   label: "Companies" },
      { href: "/quotations",icon: FileText,    label: "Quotations" },
    ],
  },
  {
    title: "TRAINING",
    items: [
      { href: "/courses",     icon: BookMarked,     label: "Courses" },
      { href: "/batches",     icon: BookOpen,       label: "Batches" },
      { href: "/attendance",  icon: ClipboardCheck, label: "Attendance" },
      { href: "/placements",  icon: Briefcase,      label: "Placements" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-40 flex h-screen flex-col bg-slate-900 text-slate-100",
      "border-r border-slate-800 transition-all duration-200 shrink-0",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Brand */}
      <div className="relative flex h-[60px] items-center border-b border-slate-800/80 px-4 shrink-0">
        <div className={cn("flex items-center", collapsed ? "justify-center w-full" : "gap-3")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/25">
            <MessageSquare className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-[13px] font-bold tracking-tight text-white">Aadhirai CRM</p>
              <p className="text-[10px] font-medium text-slate-400">Lead Management</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <div className="sidebar-scroll flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className={cn("mb-1", si > 0 && "mt-3")}>
            {!collapsed && (
              <p className="mb-1.5 px-5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5 px-3">
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = href === "/" ? location === "/" : location.startsWith(href);
                return (
                  <Link key={href} href={href}>
                    <div
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer relative",
                        collapsed ? "justify-center px-2" : "gap-3 px-3",
                        active
                          ? "bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 text-white border-l-[3px] border-indigo-400"
                          : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      )}
                    >
                      <Icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        active ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-400"
                      )} />
                      {!collapsed && <span className="flex-1 truncate">{label}</span>}
                      {!collapsed && active && <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dev section — only shown in dev mode */}
        {import.meta.env.DEV && (
          <div className="mt-3">
            {!collapsed && (
              <p className="mb-1.5 px-5 text-[10px] font-bold tracking-widest text-amber-500/70 uppercase">
                Dev Tools
              </p>
            )}
            <div className="space-y-0.5 px-3">
              {[
                { href: "/dev/meta-console", label: "Meta Console" },
                { href: "/dev/whatsapp",     label: "WA Quick Send" },
                { href: "/dev/e2e",          label: "E2E Lab" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}>
                  <div
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer relative",
                      collapsed ? "justify-center px-2" : "gap-3 px-3",
                      location.startsWith(href)
                        ? "bg-amber-500/20 text-amber-300 border-l-[3px] border-amber-400"
                        : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    )}
                  >
                    <FlaskConical className="h-[18px] w-[18px] shrink-0 text-amber-500" />
                    {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-800/80 p-3">
        {user && (
          <>
            <div className={cn("mb-2.5 flex items-center", collapsed ? "justify-center" : "gap-2.5 px-1")}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white shadow-md">
                {user.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">{user.fullName}</p>
                  <p className="text-[10px] capitalize text-slate-400">{user.role}</p>
                </div>
              )}
              {!collapsed && <NotificationBell />}
            </div>
            <div className={cn("flex gap-1.5", collapsed && "flex-col")}>
              <button
                onClick={logout}
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400",
                  collapsed ? "" : "gap-1.5"
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
                {!collapsed && "Logout"}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

/* Mobile hamburger button — rendered outside sidebar */
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 shadow-lg shadow-black/20 text-slate-100 lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  );
}
