"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogPanel,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useSearch } from "@/lib/search-context";
import { useClinic } from "@/lib/clinic-context";
import { useSession } from "@/lib/session-context";
import { mergePermissions } from "@/lib/permissions";
import {
  Loader2,
  Plus,
  Phone,
  Check,
  ArrowRight,
  RefreshCw,
  X,
  SkipForward,
  UserPlus,
  QrCode,
  Copy,
  Search,
  Monitor,
  Printer,
} from "lucide-react";
import { PairDisplayDialog } from "@/components/pair-display-dialog";

/* ── Types ──────────────────────────────────────────────────────────────── */

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

interface QueueStats {
  waiting: number;
  serving: number;
  completed: number;
  skipped: number;
  total: number;
}

interface QueueResponse {
  queue: QueueEntry[];
  stats: QueueStats;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<QueueEntry["status"], string> = {
  waiting: "Waiting",
  serving: "Serving",
  completed: "Completed",
  skipped: "Skipped",
};

const STATUS_BADGE_CLASS: Record<QueueEntry["status"], string> = {
  waiting:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  serving: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  skipped:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const FILTER_OPTIONS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Waiting", value: "waiting" },
  { label: "Serving", value: "serving" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
];

const SORT_OPTIONS: { label: string; value: "token" | "time" | "name" }[] = [
  { label: "Token", value: "token" },
  { label: "Time", value: "time" },
  { label: "Name", value: "name" },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Page Component ─────────────────────────────────────────────────────── */

export default function QueuePage() {
  /* ── State ──────────────────────────────────────────────────────────── */

  const { clinics, selectedClinicId } = useClinic();
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isOpdOpen, setIsOpdOpen] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isTogglingOpd, setIsTogglingOpd] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Add-patient dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // QR dialog
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pair display dialog
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState<{ id: string; token: number; name: string } | null>(null);
  const [opdCloseConfirm, setOpdCloseConfirm] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"token" | "time" | "name">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAll, setShowAll] = useState(false);
  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const { user } = useSession();
  const permissions = useMemo(
    () => mergePermissions(user?.role ?? "admin", user?.permissions),
    [user],
  );

  /* ── Data fetching ──────────────────────────────────────────────────── */

  // Fetch queue for the selected clinic
  const fetchQueue = useCallback(async () => {
    if (!selectedClinicId) return;
    try {
      setIsLoadingQueue(true);
      setPageError(null);
      const res = await fetch(`/api/queue?clinic_id=${selectedClinicId}`);
      if (!res.ok) throw new Error("Failed to load queue");
      const data: QueueResponse = await res.json();
      setQueue(data.queue);
      setStats(data.stats);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load queue",
      );
    } finally {
      setIsLoadingQueue(false);
    }
  }, [selectedClinicId]);

  // Initial queue load + Realtime subscription
  useEffect(() => {
    if (!selectedClinicId) return;

    const timer = setTimeout(fetchQueue, 0);

    const channel = supabase
      .channel(`queue-${selectedClinicId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue",
          filter: `clinic_id=eq.${selectedClinicId}`,
        },
        () => {
          fetchQueue();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [selectedClinicId, fetchQueue]);

  // Sync OPD + reset filters when selected clinic changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedClinic) {
        setIsOpdOpen(selectedClinic.is_opd_open);
      }
      setSearchQuery("");
      setStatusFilter(null);
      setShowAll(false);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinic?.id]);

  /* ── Actions ────────────────────────────────────────────────────────── */

  const toggleOpd = useCallback(async () => {
    if (!selectedClinicId) return;
    try {
      setIsTogglingOpd(true);
      const res = await fetch(`/api/clinics/${selectedClinicId}/opd`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to toggle OPD");
      const data = await res.json();
      setIsOpdOpen(data.is_opd_open);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to toggle OPD",
      );
    } finally {
      setIsTogglingOpd(false);
    }
  }, [selectedClinicId]);

  const handleAddPatient = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!patientName.trim() || !selectedClinicId) return;

      try {
        setIsAddingPatient(true);
        setAddError(null);
        const res = await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinic_id: selectedClinicId,
            patient_name: patientName.trim(),
            phone: patientPhone.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to add patient");
        }
        // Reset + close dialog
        setPatientName("");
        setPatientPhone("");
        setIsAddDialogOpen(false);
        // Refresh queue immediately
        fetchQueue();
      } catch (err) {
        setAddError(
          err instanceof Error ? err.message : "Failed to add patient",
        );
      } finally {
        setIsAddingPatient(false);
      }
    },
    [patientName, patientPhone, selectedClinicId, fetchQueue],
  );

  const updatePatientStatus = useCallback(
    async (id: string, status: "serving" | "completed" | "skipped") => {
      try {
        setActionLoadingId(id);
        const res = await fetch(`/api/queue/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Failed to update patient status");
        fetchQueue();
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Failed to update patient",
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchQueue],
  );

  // Confirmation handlers are defined inline in the AlertDialog JSX below

  /* ── Derived values ─────────────────────────────────────────────────── */

  const nextWaiting =
    queue
      .filter((p) => p.status === "waiting")
      .sort((a, b) => a.token_number - b.token_number)[0] ?? null;

  const handleCallNext = useCallback(async () => {
    if (!nextWaiting) return;
    await updatePatientStatus(nextWaiting.id, "serving");
  }, [nextWaiting, updatePatientStatus]);

  const statCards: { label: string; value: number; color: string }[] = [
    { label: "Waiting", value: stats?.waiting ?? 0, color: "text-amber-600" },
    { label: "Serving", value: stats?.serving ?? 0, color: "text-blue-600" },
    { label: "Completed", value: stats?.completed ?? 0, color: "text-emerald-600" },
    { label: "Skipped", value: stats?.skipped ?? 0, color: "text-neutral-500" },
  ];

  const completedEntries = useMemo(
    () => queue.filter((e) => e.status === "completed"),
    [queue],
  );

  const servedToday = completedEntries.length;

  const avgWaitMinutes = useMemo(() => {
    if (servedToday === 0) return null;
    let totalMs = 0;
    for (const entry of completedEntries) {
      if (entry.called_at && entry.created_at) {
        totalMs +=
          new Date(entry.called_at).getTime() -
          new Date(entry.created_at).getTime();
      }
    }
    return Math.round(totalMs / servedToday / 60000);
  }, [completedEntries, servedToday]);

  const nowServingEntry = queue.find((e) => e.status === "serving");
  const nowServingDisplay = nowServingEntry
    ? `#${nowServingEntry.token_number}`
    : "—";

  const waitingCount = queue.filter((e) => e.status === "waiting").length;

  const qrUrl = (typeof window !== "undefined" && selectedClinicId)
    ? window.location.origin + "/token?clinic_id=" + selectedClinicId
    : "";

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available — silently fail
    }
  }, [qrUrl]);

  const handlePrintQr = useCallback(() => {
    window.print();
  }, []);

  // ── Filtered + sorted queue ──────────────────────────────────────────

  const filteredQueue = useMemo(() => {
    let result = [...queue];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.patient_name.toLowerCase().includes(q) ||
          (e.phone && e.phone.toLowerCase().includes(q)) ||
          e.token_number.toString().includes(q),
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "token") cmp = a.token_number - b.token_number;
      else if (sortBy === "time")
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortBy === "name")
        cmp = a.patient_name.localeCompare(b.patient_name);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [queue, searchQuery, statusFilter, sortBy, sortOrder]);

  const hasActiveFilter = searchQuery.trim().length > 0 || statusFilter !== null;
  const displayedEntries = useMemo(
    () => (showAll || hasActiveFilter ? filteredQueue : filteredQueue.slice(0, 10)),
    [filteredQueue, showAll, hasActiveFilter],
  );

  /* ── Empty state (no clinics in the system) ─────────────────────────── */

  if (clinics.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-canvas-soft p-3">
            <RefreshCw className="size-6 text-mute" />
          </div>
          <h1 className="text-xl font-semibold text-ink">No Clinics Found</h1>
          <p className="text-sm text-body">
            Please add a clinic in the admin panel to get started.
          </p>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Email verification banner */}
      {user && !user.emailConfirmed && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="flex-1">
            Please verify your email address. Check your inbox for a confirmation link.
          </span>
          <button
            type="button"
            onClick={async () => {
              try {
                const { error } = await supabase.auth.resend({
                  type: "signup",
                  email: user.email!,
                });
                if (error) setPageError(error.message);
              } catch {
                setPageError("Failed to resend verification email");
              }
            }}
            className="shrink-0 font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
          >
            Resend
          </button>
        </div>
      )}

      {/* Error banner (Polaris-style) */}
      {pageError && (
        <div
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <X className="size-4 shrink-0 text-red-400" aria-hidden="true" />
          <span className="flex-1">{pageError}</span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
            onClick={() => setPageError(null)}
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}



      {/* ═══ Filters ═════════════════════════════════════════════════════ */}
      <section aria-label="Filter and sort queue">
        <div className="space-y-3">

          {/* Status filter pills + Sort controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filters */}
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === f.value ? null : f.value,
                  )
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-ink text-white"
                    : "bg-canvas text-body border border-hairline hover:bg-canvas-soft",
                )}
              >
                {f.label}
              </button>
            ))}

            {/* Visual separator */}
            <span
              className="mx-1 hidden h-5 w-px bg-hairline sm:block"
              aria-hidden="true"
            />

            {/* Sort controls */}
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (sortBy === s.value) {
                    setSortOrder(
                      sortOrder === "asc" ? "desc" : "asc",
                    );
                  } else {
                    setSortBy(s.value);
                    setSortOrder("asc");
                  }
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  sortBy === s.value
                    ? "bg-ink text-white"
                    : "bg-canvas text-body border border-hairline hover:bg-canvas-soft",
                )}
              >
                {s.label}{" "}
                {sortBy === s.value
                  ? sortOrder === "asc"
                    ? "↑"
                    : "↓"
                  : "↑"}
              </button>
            ))}

            {/* Result count */}
            <span className="ml-auto text-xs tabular-nums text-body">
              {filteredQueue.length} / {queue.length}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Stats Row ════════════════════════════════════════════════════ */}
      <section aria-label="Queue statistics">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-hairline bg-canvas p-5 shadow-level-2"
            >
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                {s.label}
              </p>
              <p className={cn("mt-1.5 text-3xl font-semibold tracking-tight tabular-nums", s.color)}>
                {isLoadingQueue ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  s.value
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Daily Summary ════════════════════════════════════════════════ */}
      <section aria-label="Today's summary">
        <div className="rounded-lg border border-hairline bg-canvas p-5 shadow-level-1">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                Served Today
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
                {servedToday}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                Avg Wait
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
                {avgWaitMinutes !== null
                  ? `${avgWaitMinutes} min`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                Now Serving
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
                {nowServingDisplay}
              </p>
            </div>
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
                Waiting
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ink">
                {waitingCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Controls Toolbar ═════════════════════════════════════════════ */}
      <section aria-label="Queue controls">
        <div className="flex flex-wrap items-center gap-3">
          {/* OPD Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-1.5 shadow-level-1">
            <div
              className={cn(
                "size-2 rounded-full",
                isOpdOpen ? "bg-emerald-500" : "bg-neutral-400",
              )}
            />
            <span className="text-sm font-medium text-ink">OPD</span>
            <span
              className={cn(
                "text-sm font-medium",
                isOpdOpen ? "text-emerald-600" : "text-neutral-500",
              )}
            >
              {isOpdOpen ? "Open" : "Closed"}
            </span>
            {permissions.canToggleOpd && (
              <button
                type="button"
                onClick={() => {
                  if (isOpdOpen) {
                    setOpdCloseConfirm(true);
                  } else {
                    toggleOpd();
                  }
                }}
                disabled={isTogglingOpd}
                className="ml-1 text-xs text-body underline-offset-2 hover:text-ink hover:underline"
              >
                Toggle
              </button>
            )}
          </div>

          {/* Spacer on larger screens */}
          <div className="hidden flex-1 sm:block" />

          {/* Call Next */}
          {permissions.canCallPatient && (
            <Button
              className="rounded-full bg-ink text-white hover:bg-ink/90 px-5 h-9 text-sm font-medium"
              onClick={handleCallNext}
              disabled={!nextWaiting || !!actionLoadingId}
              aria-label={
                nextWaiting
                  ? `Call next patient (Token #${nextWaiting.token_number})`
                  : "No waiting patients"
              }
            >
              {actionLoadingId === "call-next" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
              <span>
                {nextWaiting
                  ? `Call Next (#${nextWaiting.token_number})`
                  : "No Waiting Patients"}
              </span>
            </Button>
          )}

          {/* Add Patient */}
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setPatientName("");
                setPatientPhone("");
                setAddError(null);
              }
            }}
          >
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  className="rounded-full border-hairline h-9 px-4 text-sm"
                  disabled={!isOpdOpen}
                  aria-label="Add new patient"
                />
              }
            >
              <Plus className="size-4 mr-1.5" aria-hidden="true" />
              <span>Add Patient</span>
            </DialogTrigger>

            <DialogContent className="rounded-xl border border-hairline bg-canvas p-6 shadow-level-5">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-ink">
                  Add New Patient
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddPatient}>
                <DialogPanel>
                  <div className="flex flex-col gap-4">
                    {/* Patient Name */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="patient-name">
                        Patient Name{" "}
                        <span className="text-destructive-foreground">*</span>
                      </Label>
                      <Input
                        id="patient-name"
                        placeholder="e.g. John Doe"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        required
                        disabled={isAddingPatient}
                        autoComplete="name"
                        className="rounded-lg border border-hairline bg-canvas h-10 px-3 text-sm text-ink placeholder:text-mute focus:border-link focus:shadow-level-2 outline-none"
                      />
                    </div>

                    {/* Phone (optional) */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="patient-phone">
                        Phone{" "}
                        <span className="text-body">(optional)</span>
                      </Label>
                      <Input
                        id="patient-phone"
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        disabled={isAddingPatient}
                        autoComplete="tel"
                        className="rounded-lg border border-hairline bg-canvas h-10 px-3 text-sm text-ink placeholder:text-mute focus:border-link focus:shadow-level-2 outline-none"
                      />
                    </div>

                    {addError && (
                      <p
                        className="flex items-center gap-1.5 text-sm text-red-600"
                        role="alert"
                      >
                        <X className="size-3.5 shrink-0" aria-hidden="true" />
                        {addError}
                      </p>
                    )}

                    {selectedClinic && (
                      <p className="flex items-center gap-1.5 text-xs text-body">
                        <Phone className="size-3.5" aria-hidden="true" />
                        {selectedClinic.name} — Token #
                        {stats ? stats.total + 1 : "—"}
                      </p>
                    )}
                  </div>
                </DialogPanel>

                <DialogFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isAddingPatient}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    type="submit"
                    loading={isAddingPatient}
                    disabled={!patientName.trim()}
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Add Patient
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Display QR */}
          <Button
            variant="outline"
            className="rounded-full border-hairline h-9 px-4 text-sm"
            onClick={() => setShowQrDialog(true)}
          >
            <QrCode className="size-4 mr-1.5" />
            Display QR
          </Button>

          {/* Pair Display */}
          <Button
            variant="outline"
            className="rounded-full border-hairline h-9 px-4 text-sm"
            onClick={() => setShowPairDialog(true)}
          >
            <Monitor className="size-4 mr-1.5" />
            Pair Display
          </Button>
        </div>
      </section>

      {/* ═══ Queue Table ══════════════════════════════════════════════════ */}
      <section aria-label="Patient queue">
        {/* Loading overlay */}
        {isLoadingQueue && queue.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-hairline py-16">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-5 animate-spin text-mute" />
              <p className="text-sm text-body">Loading queue…</p>
            </div>
          </div>
        )}

        {/* Empty queue (no entries at all) */}
        {!isLoadingQueue && queue.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-hairline py-16">
            <div className="flex max-w-xs flex-col items-center gap-2 text-center">
              <RefreshCw className="size-6 text-mute/60" />
              <p className="font-medium text-ink">Queue is empty</p>
              <p className="text-sm text-body">
                {isOpdOpen
                  ? "Add a patient to get started, or wait for patients to arrive."
                  : "OPD is closed. Open it to start accepting patients."}
              </p>
            </div>
          </div>
        )}

        {/* Queue has entries — show filtered/sorted results */}
        {queue.length > 0 && (
          <>
            {displayedEntries.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-2">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hairline bg-canvas-soft">
                      <th className="font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-left">
                        Token #
                      </th>
                      <th className="font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-left">
                        Patient
                      </th>
                      <th className="hidden sm:table-cell font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-left">
                        Phone
                      </th>
                      <th className="font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-left">
                        Status
                      </th>
                      <th className="hidden md:table-cell font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-left">
                        Called
                      </th>
                      <th className="font-mono text-xs font-medium uppercase tracking-wider text-mute px-4 py-2.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedEntries.map((entry) => {
                      const isActionLoading = actionLoadingId === entry.id;
                      return (
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
                          <td className="hidden sm:table-cell px-4 py-3 text-sm text-body">
                            {entry.phone || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                STATUS_BADGE_CLASS[entry.status],
                              )}
                            >
                              {STATUS_LABEL[entry.status]}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-body">
                            {formatTime(entry.called_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {entry.status === "waiting" && (
                                <>
                                  {permissions.canCallPatient && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        updatePatientStatus(entry.id, "serving")
                                      }
                                      disabled={isActionLoading}
                                      aria-label={`Call token #${entry.token_number}`}
                                    >
                                      {isActionLoading ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      ) : (
                                        <ArrowRight className="size-3.5" />
                                      )}
                                      <span className="hidden sm:inline">Call</span>
                                    </Button>
                                  )}
                                  {permissions.canSkipPatient && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        setSkipConfirm({
                                          id: entry.id,
                                          token: entry.token_number,
                                          name: entry.patient_name,
                                        })
                                      }
                                      disabled={isActionLoading}
                                      aria-label={`Skip token #${entry.token_number}`}
                                    >
                                      {isActionLoading ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      ) : (
                                        <SkipForward className="size-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </>
                              )}
                              {entry.status === "serving" && permissions.canCompletePatient && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updatePatientStatus(entry.id, "completed")
                                  }
                                  disabled={isActionLoading}
                                  aria-label={`Mark token #${entry.token_number} as completed`}
                                >
                                  {isActionLoading ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Check className="size-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Complete</span>
                                </Button>
                              )}
                              {(entry.status === "completed" ||
                                entry.status === "skipped") && (
                                <span className="text-xs text-body">
                                  {formatTime(entry.completed_at)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Show all button (hidden when filtering/searching) */}
                {filteredQueue.length > 10 && !showAll && !hasActiveFilter && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="w-full py-2 text-xs text-body hover:text-ink border-t border-hairline transition-colors"
                  >
                    Show all {filteredQueue.length} entries
                  </button>
                )}
              </div>
            ) : (
              /* No results match filters */
              <div className="flex items-center justify-center rounded-lg border border-hairline py-16">
                <div className="flex max-w-xs flex-col items-center gap-2 text-center">
                  <Search className="size-6 text-mute/60" />
                  <p className="font-medium text-ink">No results found</p>
                  <p className="text-sm text-body">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ═══ QR Code Dialog ═══════════════════════════════════════════════ */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="rounded-xl border border-hairline bg-canvas p-6 shadow-level-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-ink">
              Patient Token Lookup QR Code
            </DialogTitle>
            <DialogDescription className="text-sm text-body">
              Scan to check your token on your phone
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <div id="qr-print-area" className="flex flex-col items-center gap-4">
              {/* QR Code Image */}
              <div className="overflow-hidden rounded-lg border border-hairline bg-white p-2 shadow-level-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                  alt="QR Code for patient queue"
                  width={200}
                  height={200}
                  className="size-48"
                />
              </div>

              {/* URL Display + Copy + Print */}
              <div className="flex w-full items-center gap-2">
                <input
                  readOnly
                  value={qrUrl}
                  className="flex-1 rounded-lg border border-hairline bg-canvas-soft h-9 px-3 text-sm text-body outline-none"
                  aria-label="Queue URL"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintQr}
                  className="shrink-0"
                >
                  <Printer className="size-3.5 mr-1" />
                  Print
                </Button>
              </div>
            </div>
          </DialogPanel>

          <DialogFooter variant="bare">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowQrDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Pair Display Dialog ════════════════════════════════════════ */}
      <PairDisplayDialog
        open={showPairDialog}
        onOpenChange={setShowPairDialog}
        defaultClinicId={selectedClinicId}
      />

      {/* ═══ Skip Patient Confirmation ════════════════════════════════════ */}
      <AlertDialog
        open={!!skipConfirm}
        onOpenChange={(open) => !open && setSkipConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to skip Token #{skipConfirm?.token} (
              {skipConfirm?.name})? This will move them to the skipped list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogPanel className="flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setSkipConfirm(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (skipConfirm) {
                  updatePatientStatus(skipConfirm.id, "skipped");
                }
                setSkipConfirm(null);
              }}
            >
              Skip Patient
            </AlertDialogAction>
          </AlertDialogPanel>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Close OPD Confirmation ══════════════════════════════════════ */}
      <AlertDialog open={opdCloseConfirm} onOpenChange={setOpdCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close OPD</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close OPD? New patients will not be
              able to join the queue. Existing patients will still be served.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogPanel className="flex justify-end gap-2">
            <AlertDialogCancel onClick={() => setOpdCloseConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setOpdCloseConfirm(false);
                toggleOpd();
              }}
            >
              Close OPD
            </AlertDialogAction>
          </AlertDialogPanel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
