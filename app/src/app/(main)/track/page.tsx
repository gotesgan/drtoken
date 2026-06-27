"use client";

import { useState, useEffect, useCallback } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Phone, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  is_opd_open: boolean;
}

interface QueueEntry {
  id: string;
  clinic_id: string;
  token_number: number;
  patient_name: string;
  phone: string | null;
  status: "waiting" | "serving" | "completed" | "skipped";
  created_at: string;
}

interface LookupResponse {
  entry: QueueEntry | null;
  position: number;
  ahead: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  QueueEntry["status"],
  {
    badge: string;
    badgeColor: string;
    headerBg: string;
    headerText: string;
  }
> = {
  waiting: {
    badge: "Waiting",
    badgeColor:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-50 text-amber-700",
    headerBg: "bg-canvas-soft",
    headerText: "text-ink",
  },
  serving: {
    badge: "Serving",
    badgeColor:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700",
    headerBg: "bg-blue-50",
    headerText: "text-blue-700",
  },
  completed: {
    badge: "Completed",
    badgeColor:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-50 text-emerald-700",
    headerBg: "bg-emerald-50",
    headerText: "text-emerald-700",
  },
  skipped: {
    badge: "Skipped",
    badgeColor:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-neutral-100 text-neutral-600",
    headerBg: "bg-neutral-100",
    headerText: "text-neutral-600",
  },
};

/* ── Page Component ─────────────────────────────────────────────────────── */

export default function TrackPage() {
  /* ── State ──────────────────────────────────────────────────────────── */

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* ── Load clinics on mount ──────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoadingClinics(true);
        const res = await fetch("/api/clinics");
        if (!res.ok) throw new Error("Failed to load clinics");
        const data: Clinic[] = await res.json();
        if (cancelled) return;
        setClinics(data);
        if (data.length > 0) {
          setSelectedClinicId(data[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(
            err instanceof Error ? err.message : "Failed to load clinics",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingClinics(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Handle token lookup ────────────────────────────────────────────── */

  const handleSearch = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!selectedClinicId) {
        setSearchError("Please select a clinic");
        return;
      }
      if (!phone.trim()) {
        setSearchError("Please enter your phone number");
        return;
      }

      setSearchError(null);
      setResult(null);
      setHasSearched(true);

      try {
        setIsSearching(true);
        const params = new URLSearchParams({
          clinic_id: selectedClinicId,
          phone: phone.trim(),
        });
        const res = await fetch(`/api/queue/lookup?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? "Failed to look up token");
        }
        const data: LookupResponse = await res.json();
        setResult(data);
      } catch (err) {
        setSearchError(
          err instanceof Error ? err.message : "Failed to look up token",
        );
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    },
    [selectedClinicId, phone],
  );

  /* ── Handle clinic change ───────────────────────────────────────────── */

  const handleClinicChange = useCallback((value: string | null) => {
    if (!value) return;
    setSelectedClinicId(value);
    setResult(null);
    setHasSearched(false);
    setSearchError(null);
  }, []);

  /* ── Handle phone change ────────────────────────────────────────────── */

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(e.target.value);
      if (hasSearched) {
        setResult(null);
        setHasSearched(false);
        setSearchError(null);
      }
    },
    [hasSearched],
  );

  /* ── Derived values ─────────────────────────────────────────────────── */

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const canSearch = Boolean(selectedClinicId && phone.trim());

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* ── Loading state ───────────────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (isLoadingClinics) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-3 py-20">
          <Spinner className="size-6 text-mute" />
          <p className="text-sm text-body">Loading clinics…</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* ── Empty state (no clinics) ────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════════════ */

  if (clinics.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-canvas-soft p-3">
            <Building2 className="size-6 text-mute" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-ink">No Clinics Available</h1>
          <p className="text-sm text-body">
            There are no clinics in the system yet. Please check back later.
          </p>
          <Button
            variant="outline"
            className="mt-2"
            render={<Link href="/" />}
          >
            Back to Staff Panel
          </Button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* ── Render ──────────────────────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* ═══ Page heading ═════════════════════════════════════════════════ */}
      <h1 className="text-2xl font-semibold tracking-tight text-ink mb-6">
        Track Your Token
      </h1>

      {/* ═══ Page-level error banner ═════════════════════════════════════ */}
      {pageError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {/* ═══ Search Card ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-hairline bg-canvas p-6 shadow-level-3 sm:p-8">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute mb-4">
          Find Your Token
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Clinic selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="clinic-select"
              className="text-sm font-medium text-ink"
            >
              Clinic
            </label>
            <Select
              value={selectedClinicId}
              onValueChange={handleClinicChange}
            >
              <SelectTrigger
                id="clinic-select"
                aria-label="Select clinic"
              >
                <SelectValue placeholder="Select a clinic…" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClinic?.address && (
              <p className="flex items-center gap-1 text-xs text-body">
                <Building2 className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{selectedClinic.address}</span>
              </p>
            )}
          </div>

          {/* Phone input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="phone-input"
              className="text-sm font-medium text-ink"
            >
              Phone Number
            </label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={handlePhoneChange}
              autoComplete="tel"
              aria-describedby={searchError ? "search-error" : undefined}
            />
          </div>

          {/* Search error (inline validation) */}
          {!hasSearched && searchError && (
            <p
              id="search-error"
              className="text-sm text-red-600"
              role="alert"
            >
              {searchError}
            </p>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!canSearch}
            loading={isSearching}
            className="w-full rounded-full bg-ink text-white hover:bg-ink/90 h-10 text-sm font-medium"
          >
            Check My Token
          </Button>
        </form>
      </div>

      {/* ═══ Results ══════════════════════════════════════════════════════ */}
      {hasSearched && !isSearching && (
        <div className="mt-6">
          {result?.entry ? (
            /* ── Entry found ── */
            (() => {
              const entry = result.entry;
              const cfg = STATUS_CONFIG[entry.status];

              if (entry.status === "waiting") {
                return (
                  <div className="rounded-xl border border-hairline bg-canvas shadow-level-2 overflow-hidden">
                    <div
                      className={cn(
                        "border-b border-hairline px-6 py-8 text-center",
                        cfg.headerBg,
                      )}
                    >
                      <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute mb-2">
                        Token Number
                      </p>
                      <p
                        className={cn(
                          "text-5xl sm:text-6xl font-bold tracking-tight tabular-nums",
                          cfg.headerText,
                        )}
                      >
                        #{entry.token_number}
                      </p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-body">Patient</p>
                          <p className="text-base font-medium text-ink">
                            {entry.patient_name}
                          </p>
                        </div>
                        <span className={cfg.badgeColor}>
                          {cfg.badge}
                        </span>
                      </div>
                      <div className="rounded-lg bg-canvas-soft p-4">
                        <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute mb-1">
                          Your Position
                        </p>
                        <p className="text-2xl font-semibold tabular-nums text-ink">
                          {result.position}
                        </p>
                        <p className="text-sm text-body mt-1">
                          {result.ahead === 0
                            ? "You're next!"
                            : `${result.ahead} patient${result.ahead !== 1 ? "s" : ""} ahead of you`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (entry.status === "serving") {
                return (
                  <div className="rounded-xl border border-hairline bg-canvas shadow-level-2 overflow-hidden">
                    <div
                      className={cn(
                        "border-b border-hairline px-6 py-8 text-center",
                        cfg.headerBg,
                      )}
                    >
                      <p className="font-mono text-xs font-medium uppercase tracking-wider text-blue-700 mb-2">
                        Token Number
                      </p>
                      <p
                        className={cn(
                          "text-5xl sm:text-6xl font-bold tracking-tight tabular-nums",
                          cfg.headerText,
                        )}
                      >
                        #{entry.token_number}
                      </p>
                    </div>
                    <div className="p-6 text-center">
                      <p className="text-lg font-semibold text-ink">
                        You are currently being served!
                      </p>
                      <p className="text-sm text-body mt-1">
                        Please proceed to the doctor&apos;s chamber.
                      </p>
                    </div>
                  </div>
                );
              }

              if (entry.status === "completed") {
                return (
                  <div className="rounded-xl border border-hairline bg-canvas shadow-level-2 overflow-hidden">
                    <div
                      className={cn(
                        "border-b border-hairline px-6 py-8 text-center",
                        cfg.headerBg,
                      )}
                    >
                      <p className="font-mono text-xs font-medium uppercase tracking-wider text-emerald-700 mb-2">
                        Completed
                      </p>
                      <p
                        className={cn(
                          "text-4xl font-bold tracking-tight tabular-nums",
                          cfg.headerText,
                        )}
                      >
                        #{entry.token_number}
                      </p>
                    </div>
                    <div className="p-6 text-center">
                      <p className="text-base text-body">
                        Your visit has been completed. Thank you.
                      </p>
                    </div>
                  </div>
                );
              }

              /* skipped */
              return (
                <div className="rounded-xl border border-hairline bg-canvas shadow-level-2 overflow-hidden">
                  <div
                    className={cn(
                      "border-b border-hairline px-6 py-8 text-center",
                      cfg.headerBg,
                    )}
                  >
                    <p className="font-mono text-xs font-medium uppercase tracking-wider text-neutral-600 mb-2">
                      Skipped
                    </p>
                    <p
                      className={cn(
                        "text-4xl font-bold tracking-tight tabular-nums",
                        cfg.headerText,
                      )}
                    >
                      #{entry.token_number}
                    </p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-base text-body">
                      Your token was skipped. Please contact the reception for
                      assistance.
                    </p>
                  </div>
                </div>
              );
            })()
          ) : searchError ? (
            /* ── Error state (API error) ── */
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {searchError}
            </div>
          ) : (
            /* ── Not found ── */
            <div className="rounded-xl border border-hairline bg-canvas p-8 text-center shadow-level-2">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-canvas-soft">
                <Phone className="size-5 text-mute" aria-hidden="true" />
              </div>
              <p className="text-base font-medium text-ink">No Record Found</p>
              <p className="text-sm text-body mt-1">
                No queue entry matches this phone number for today.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Quick Stats (only when waiting) ══════════════════════════════ */}
      {result?.entry?.status === "waiting" && (
        <div className="mt-4 rounded-xl border border-hairline bg-canvas p-4 shadow-level-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-body">Waiting ahead of you</span>
            <span className="text-lg font-semibold tabular-nums text-ink">
              {result.ahead}
            </span>
          </div>
        </div>
      )}

      {/* ═══ Clinic info footer ══════════════════════════════════════════ */}
      {selectedClinic && (
        <div className="mt-8 text-center text-xs text-body">
          <p>
            {selectedClinic.name}
            {selectedClinic.address && (
              <>
                {" "}&middot;{" "}
                {selectedClinic.address}
              </>
            )}
          </p>
          <p className="mt-0.5">
            {selectedClinic.is_opd_open ? (
              <span className="text-emerald-600">OPD Open</span>
            ) : (
              <span className="text-red-600">OPD Closed</span>
            )}
          </p>
        </div>
      )}

      {/* ═══ New search prompt (when result is showing) ══════════════════ */}
      {hasSearched && !isSearching && (
        <p className="mt-4 text-center text-xs text-body">
          Enter a different phone number above to look up another token.
        </p>
      )}
    </div>
  );
}
