"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Search, Monitor, CalendarDays, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Staff", href: "/", icon: Users },
  { label: "Track", href: "/track", icon: Search },
  { label: "Display", href: "/device", icon: Monitor },
  { label: "History", href: "/history", icon: CalendarDays },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const handleLogout = () => {
    // Auth integration will come later
  };

  return (
    <>
      {/* ── Desktop sidebar (md+) ───────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 md:z-30 border-r border-hairline bg-canvas">
        {/* Brand */}
        <Link
          href="/"
          className="text-sm font-semibold text-ink px-4 py-5 block"
        >
          Dr. Token System
        </Link>

        {/* Navigation */}
        <nav
          className="flex-1 flex flex-col gap-1 py-1 px-3 mx-2"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-canvas-soft text-ink font-medium"
                    : "text-body hover:text-ink hover:bg-canvas-soft/60",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-hairline px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-body hover:text-ink hover:bg-canvas-soft/60 transition-colors"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </button>
        </div>

        {/* Footer spacer */}
        <div className="px-4 py-4" />
      </aside>

      {/* ── Mobile bottom tab bar (<md) ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden h-14 border-t border-hairline bg-canvas flex items-center justify-around px-2"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 min-w-0",
                active ? "text-ink" : "text-mute",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="text-[10px] leading-tight whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Logout on mobile */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-0 text-mute hover:text-ink transition-colors"
          aria-label="Logout"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}
