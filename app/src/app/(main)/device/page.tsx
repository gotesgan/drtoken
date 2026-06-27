"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface QueueEntry {
  id: string;
  clinic_id: string;
  token_number: number;
  patient_name: string;
  status: "waiting" | "serving" | "completed" | "skipped";
}

interface Clinic {
  id: string;
  name: string;
  is_opd_open: boolean;
}

export default function DevicePage() {
  const [serving, setServing] = useState<QueueEntry | null>(null);
  const [waiting, setWaiting] = useState<QueueEntry[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<QueueEntry[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract clinic_id from URL search params
  const getClinicId = useCallback(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("clinic_id");
  }, []);

  const clinicId = getClinicId();

  const fetchClinic = useCallback(async () => {
    const cId = getClinicId();
    if (!cId) {
      // No clinic specified, show clinic selector
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/clinics`);
      if (!res.ok) return;
      const all: Clinic[] = await res.json();
      const found = all.find((c) => c.id === cId) ?? null;
      setClinic(found);
      setClinics(all);
    } catch {
      // ignore
    }
  }, [getClinicId]);

  const fetchDisplay = useCallback(async () => {
    const cId = getClinicId();
    if (!cId) return;
    try {
      const res = await fetch(`/api/queue?clinic_id=${cId}`);
      if (!res.ok) return;
      const data = await res.json();
      const queue: QueueEntry[] = data.queue ?? [];
      setServing(queue.find((e) => e.status === "serving") ?? null);
      setWaiting(queue.filter((e) => e.status === "waiting"));
      setRecentCompleted(
        queue
          .filter((e) => e.status === "completed")
          .slice(-3)
          .reverse(),
      );
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [getClinicId]);

  // Initial load + Realtime subscription
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClinic().then(() => fetchDisplay());
    }, 0);

    const channel = clinicId
      ? supabase
          .channel(`device-queue-${clinicId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "queue",
              filter: `clinic_id=eq.${clinicId}`,
            },
            () => {
              fetchDisplay();
            },
          )
          .subscribe()
      : null;

    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchClinic, fetchDisplay, clinicId]);

  // No clinic_id provided — show clinic picker
  if (!clinicId) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-hairline bg-canvas p-6 shadow-level-3">
          <h1 className="text-lg font-semibold text-ink">Queue Display</h1>
          <p className="mt-1 text-sm text-body">
            Select a clinic to view the queue display.
          </p>
          <div className="mt-4 space-y-3">
            {clinics.map((c) => (
              <a
                key={c.id}
                href={`/device?clinic_id=${c.id}`}
                className="block rounded-lg border border-hairline bg-canvas-soft px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft-2"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[80dvh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-mute" />
      </div>
    );
  }

  const totalWaiting = waiting.length;

  return (
    <div className="flex min-h-[80dvh] flex-col px-4 py-6 sm:px-6">
      {/* Clinic header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {clinic?.name ?? "Queue Display"}
        </h1>
        <p className="mt-1 text-sm text-body">
          {totalWaiting} waiting &middot; Live updates
        </p>
      </div>

      {/* Now Serving */}
      <section className="flex-1 flex flex-col items-center justify-center py-8">
        <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
          Now Serving
        </p>
        {serving ? (
          <div className="mt-4 text-center">
            <p className="text-7xl font-bold tracking-tight tabular-nums text-ink sm:text-8xl lg:text-9xl">
              #{serving.token_number}
            </p>
            <p className="mt-3 text-xl text-body sm:text-2xl">
              {serving.patient_name}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-xl text-body sm:text-2xl">
            {totalWaiting > 0
              ? "Calling next patient..."
              : "No patients in queue"}
          </p>
        )}
      </section>

      {/* Bottom bar: waiting queue + QR */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Waiting queue */}
        <div className="rounded-lg border border-hairline bg-canvas p-4 shadow-level-1">
          <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
            In Queue ({totalWaiting})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {waiting.slice(0, 10).map((entry) => (
              <span
                key={entry.id}
                className="rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-sm text-ink"
              >
                #{entry.token_number}
              </span>
            ))}
            {waiting.length === 0 && (
              <p className="text-sm text-body">Queue is empty</p>
            )}
            {waiting.length > 10 && (
              <span className="rounded-full border border-hairline bg-canvas-soft px-3 py-1 text-sm text-mute">
                +{waiting.length - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Recently completed */}
        {recentCompleted.length > 0 && (
          <div className="rounded-lg border border-hairline bg-canvas p-4 shadow-level-1">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
              Recently Served
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentCompleted.map((entry) => (
                <span
                  key={entry.id}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                >
                  #{entry.token_number} &check;
                </span>
              ))}
            </div>
          </div>
        )}

        {/* QR code */}
        <div className="fixed bottom-4 right-4 z-10 rounded-full border border-hairline bg-canvas px-3 py-1.5 shadow-level-2 sm:static sm:col-span-2 sm:flex sm:items-center sm:justify-center sm:rounded-lg sm:border sm:border-hairline sm:bg-canvas sm:p-3 sm:shadow-level-1">
          <a
            href={`/track?clinic_id=${clinicId}`}
            className="flex items-center gap-2 text-xs text-body hover:text-ink sm:text-sm"
          >
            <QrCode className="size-4" />
            Scan to track your token on your phone
          </a>
        </div>
      </div>
    </div>
  );
}
