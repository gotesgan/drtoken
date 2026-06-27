"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueEntry {
  id: string;
  clinic_id: string;
  token_number: number;
  patient_name: string;
  phone: string | null;
  status: "waiting" | "serving" | "completed" | "skipped";
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

interface Clinic {
  id: string;
  name: string;
}

interface Stats {
  waiting: number;
  serving: number;
  completed: number;
  skipped: number;
  total: number;
}

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  serving: "Serving",
  completed: "Completed",
  skipped: "Skipped",
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function HistoryPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clinics on mount
  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data: Clinic[]) => {
        setClinics(data);
        if (data.length > 0) setSelectedClinicId(data[0].id);
      })
      .catch(() => setError("Failed to load clinics"));
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedClinicId) return;
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = formatDate(selectedDate);
      const res = await fetch(
        `/api/queue/history?clinic_id=${selectedClinicId}&date=${dateStr}`,
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to fetch history");
      }
      const data = await res.json();
      setEntries(data.queue ?? []);
      setStats(data.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClinicId, selectedDate]);

  useEffect(() => {
    const timer = setTimeout(fetchHistory, 0);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  const dateStr = useMemo(() => formatDate(selectedDate), [selectedDate]);
  const isToday = dateStr === formatDate(new Date());

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    if (d <= new Date()) {
      setSelectedDate(d);
    }
  };

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Queue History</h1>
      <p className="mt-1 text-sm text-body">Browse past queue data by date.</p>

      {/* Filters row */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* Clinic selector */}
        <select
          aria-label="Select clinic"
          value={selectedClinicId ?? ""}
          onChange={(e) => setSelectedClinicId(e.target.value || null)}
          className="h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink shadow-level-1 outline-none focus:border-link"
        >
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Date nav */}
        <div className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-canvas p-1 shadow-level-1">
          <button
            onClick={() => changeDay(-1)}
            className="flex size-8 items-center justify-center rounded-md text-body hover:bg-canvas-soft hover:text-ink"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-ink">
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {isToday && (
              <span className="ml-1.5 rounded-full bg-ink px-2 py-0.5 text-xs text-white">
                Today
              </span>
            )}
          </span>
          <button
            onClick={() => changeDay(1)}
            disabled={isToday}
            className="flex size-8 items-center justify-center rounded-md text-body hover:bg-canvas-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats summary */}
      {stats && !isLoading && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Waiting", value: stats.waiting, className: "text-amber-700" },
            { label: "Serving", value: stats.serving, className: "text-blue-700" },
            { label: "Completed", value: stats.completed, className: "text-emerald-700" },
            { label: "Skipped", value: stats.skipped, className: "text-neutral-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-hairline bg-canvas p-4 shadow-level-1"
            >
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                {s.label}
              </p>
              <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.className)}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-mute" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-canvas p-12 text-center shadow-level-2">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-canvas-soft">
              <CalendarIcon className="size-5 text-mute" />
            </div>
            <p className="text-base font-medium text-ink">No Entries Found</p>
            <p className="mt-1 text-sm text-body">
              {selectedClinic
                ? `${selectedClinic.name} has no queue entries for ${selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
                : "Select a clinic and date to view queue history."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-2">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft">
                  <th className="font-mono px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-mute">
                    Token #
                  </th>
                  <th className="font-mono px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-mute">
                    Patient
                  </th>
                  <th className="hidden font-mono px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-mute sm:table-cell">
                    Phone
                  </th>
                  <th className="font-mono px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-mute">
                    Status
                  </th>
                  <th className="font-mono px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-mute">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-hairline last:border-0 transition-colors hover:bg-canvas-soft/60"
                  >
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-ink">
                      #{entry.token_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {entry.patient_name}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-body sm:table-cell">
                      {entry.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          entry.status === "waiting" &&
                            "bg-amber-50 text-amber-700",
                          entry.status === "serving" &&
                            "bg-blue-50 text-blue-700",
                          entry.status === "completed" &&
                            "bg-emerald-50 text-emerald-700",
                          entry.status === "skipped" &&
                            "bg-neutral-100 text-neutral-600",
                        )}
                      >
                        {STATUS_LABEL[entry.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-body">
                      {formatTime(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-hairline bg-canvas-soft px-4 py-2 text-xs text-mute">
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} for{" "}
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-mute">
        Historical queue data is read-only. Tokens reset daily.
      </p>
    </div>
  );
}
