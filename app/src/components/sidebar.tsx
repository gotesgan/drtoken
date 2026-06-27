"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Users, Monitor, CalendarDays, Settings, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClinic } from "@/lib/clinic-context";
import { useSession } from "@/lib/session-context";
import { getPermissions } from "@/lib/permissions";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

interface QueueEntry {
  id: string;
  token_number: number;
  patient_name: string;
  status: string;
}

const NAV_ITEMS = [
  { label: "Staff", href: "/", icon: Users },
  { label: "Display", href: "/display", icon: Monitor },
  { label: "History", href: "/history", icon: CalendarDays },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedClinicId } = useClinic();
  const { user } = useSession();
  const permissions = getPermissions(user?.role ?? "receptionist");
  const [servingEntry, setServingEntry] = useState<QueueEntry | null>(null);
  const [loadingServing, setLoadingServing] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const fetchServing = useCallback(async () => {
    if (!selectedClinicId) return;
    setLoadingServing(true);
    try {
      const res = await fetch(`/api/queue?clinic_id=${selectedClinicId}`);
      if (!res.ok) return;
      const data = await res.json();
      const queue: QueueEntry[] = data.queue ?? [];
      const serving = queue.find((e) => e.status === "serving") ?? null;
      setServingEntry(serving);
    } catch {
      // silent
    } finally {
      setLoadingServing(false);
    }
  }, [selectedClinicId]);

  // Initial fetch + Realtime subscription
  useEffect(() => {
    if (!selectedClinicId) return;

    const initTimer = setTimeout(fetchServing, 0);

    const channel = supabase
      .channel(`sidebar-queue-${selectedClinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue",
          filter: `clinic_id=eq.${selectedClinicId}`,
        },
        () => {
          fetchServing();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(initTimer);
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinicId, fetchServing]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/history" && !permissions.canViewHistory) return false;
    return true;
  });

  return (
    <>
      {/* ── Desktop sidebar (md+) ───────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:top-14 md:bottom-0 md:z-30 border-r border-hairline bg-canvas">
        {/* Navigation */}
        <nav
          className="flex flex-col gap-1 py-4 px-3 mx-2"
          aria-label="Main navigation"
        >
          {visibleNavItems.map((item) => {
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

        {/* ── Now Serving (live) ─────────────────────────────────────────── */}
        <div className="mx-3 mb-2 rounded-lg border border-hairline bg-canvas-soft p-3">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-mute">
            Now Serving
          </p>
          {loadingServing && !servingEntry ? (
            <div className="mt-2 flex items-center justify-center py-2">
              <Loader2 className="size-3.5 animate-spin text-mute" />
            </div>
          ) : servingEntry ? (
            <div className="mt-1.5">
              <p className="text-xl font-bold tracking-tight tabular-nums text-ink">
                #{servingEntry.token_number}
              </p>
              <p className="mt-0.5 truncate text-xs text-body">
                {servingEntry.patient_name}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-mute">No patient being served</p>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

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
        {visibleNavItems.map((item) => {
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
