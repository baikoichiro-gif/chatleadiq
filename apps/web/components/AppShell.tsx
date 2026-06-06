"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  MessageSquareText,
  QrCode,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/connect", label: "Connect", icon: QrCode },
  { href: "/chats", label: "Chats", icon: MessageSquareText },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  const pathname = usePathname();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="ChatLeadIQ home">
          <span className="brandMark">
            <Bot size={20} />
          </span>
          <span>
            <strong>ChatLeadIQ</strong>
            <small>Consent-aware CRM</small>
          </span>
        </Link>
        <nav className="nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link className={active ? "navItem active" : "navItem"} href={item.href} key={item.href}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebarNotice">
          <ShieldCheck size={17} />
          <span>No auto-send, no broadcast, human approval required.</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="statusCluster">
            <span className="statusPill green">
              <Activity size={14} /> MySQL ready
            </span>
            <span className="statusPill cyan">
              <MessageSquareText size={14} /> WhatsApp guarded
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
