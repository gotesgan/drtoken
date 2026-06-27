"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, X, Bell, LogOut, Settings } from "lucide-react";
import { useSearch } from "@/lib/search-context";
import { useClinic } from "@/lib/clinic-context";
import { useSession } from "@/lib/session-context";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CLINIC_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500",
];

function getClinicInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w[0].toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getClinicColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLINIC_COLORS[Math.abs(hash) % CLINIC_COLORS.length];
}

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TopBar() {
  const router = useRouter();
  const { query, setQuery } = useSearch();
  const { clinics, selectedClinicId, setSelectedClinicId, selectedClinic } = useClinic();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userName = user?.displayName || user?.email || "User";
  const userInitials = getUserInitials(userName);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-gray-950 border-b border-white/10">
      <div className="mx-auto flex h-full max-w-full items-center justify-between px-4">
        {/* ── Left ── */}
        <div className="flex items-center gap-3">
          <button type="button" className="md:hidden flex size-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" aria-label="Toggle navigation menu">
            <Menu className="size-5" />
          </button>
          <Link href="/app" className="text-sm font-semibold text-white tracking-tight">Dr. Token System</Link>
        </div>

        {/* ── Center: Search ── */}
        <div className="hidden md:flex flex-1 max-w-lg mx-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search by name, phone, or token..." value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/10 h-9 pl-9 pr-8 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white/20 transition-colors" aria-label="Search patients" />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-2">
          {/* Clinic selector */}
          {clinics.length > 0 && (
            <Select value={selectedClinicId} onValueChange={(val) => val && setSelectedClinicId(val)}>
              <SelectTrigger className="flex items-center gap-2 w-auto min-w-0 h-8 border border-white/10 bg-white/5 px-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors [&_[data-slot=select-icon]]:hidden cursor-pointer shadow-none">
                {selectedClinic && (
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${getClinicColor(selectedClinic.name)}`}>
                    {getClinicInitials(selectedClinic.name)}
                  </span>
                )}
                <SelectValue><span className="text-xs font-medium">{selectedClinic?.name ?? "Clinic"}</span></SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" sideOffset={4}>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    <span className="flex items-center gap-2">
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${getClinicColor(clinic.name)}`}>{getClinicInitials(clinic.name)}</span>
                      {clinic.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Notification bell */}
          <button type="button" className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Notifications">
            <Bell className="size-4" />
          </button>

          {/* User avatar with dropdown */}
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-8 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white hover:opacity-90 transition-opacity" aria-label="User menu">
              {userInitials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/10 bg-gray-900 shadow-xl py-1 z-50" role="menu">
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-medium text-white truncate">{user?.displayName || "User"}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email || ""}</p>
                </div>

                {/* Settings */}
                <Link href="/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors" role="menuitem">
                  <Settings className="size-4" />
                  Settings
                </Link>

                {/* Logout */}
                <button type="button" onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors" role="menuitem">
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
