"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, WifiOff, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface DisplaySession {
  id: string;
  pairing_code: string;
  status: "unpaired" | "paired" | "expired";
  clinic_id: string | null;
  expires_at: string;
  clinics?: { name: string } | null;
}

interface QueueEntry {
  id: string;
  clinic_id: string;
  token_number: number;
  patient_name: string;
  status: "waiting" | "serving" | "completed" | "skipped";
  created_at: string;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = "display_session_id";
const HEARTBEAT_INTERVAL = 30_000; // 30 seconds
const CLOCK_UPDATE_INTERVAL = 60_000; // 1 minute

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* ── Page Component ─────────────────────────────────────────────────────── */

export default function DisplayPage() {
  /* ── State ──────────────────────────────────────────────────────────── */

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [isPaired, setIsPaired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Queue state (paired mode)
  const [servingEntry, setServingEntry] = useState<QueueEntry | null>(null);
  const [waitingQueue, setWaitingQueue] = useState<QueueEntry[]>([]);

  // Refs
  const displayRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      displayRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const queueChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );

  /* ── Session management ─────────────────────────────────────────────── */

  const createSession = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/display/session", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const data: DisplaySession = await res.json();
      localStorage.setItem(STORAGE_KEY, data.id);
      setSessionId(data.id);
      setPairingCode(data.pairing_code);
      setIsPaired(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create display session",
      );
    }
  }, []);

  const fetchSession = useCallback(async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/display/session?id=${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          // Session not found or expired — create new one
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        throw new Error("Failed to fetch session");
      }
      const data: DisplaySession = await res.json();
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch session",
      );
      return null;
    }
  }, []);

  /* ── Heartbeat ──────────────────────────────────────────────────────── */

  const startHeartbeat = useCallback((id: string) => {
    // Clear any existing heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }

    // Send heartbeat immediately, then every 30s
    const send = async () => {
      try {
        await fetch(`/api/display/heartbeat?id=${id}`, { method: "PATCH" });
      } catch {
        // Silently fail — heartbeat is best-effort
      }
    };

    send();
    heartbeatRef.current = setInterval(send, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /* ── Realtime subscriptions ─────────────────────────────────────────── */

  const subscribeToSession = useCallback(
    (id: string) => {
      // Clean up existing subscription
      if (sessionChannelRef.current) {
        supabase.removeChannel(sessionChannelRef.current);
      }

      const channel = supabase
        .channel(`display-session-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "display_sessions",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const newData = payload.new as Partial<DisplaySession>;
            // When clinic_id changes from null → set, we're paired
            if (newData.clinic_id && newData.status === "paired") {
              setClinicId(newData.clinic_id);
              setIsPaired(true);
              // Fetch clinic name
              fetch(`/api/display/session?id=${id}`)
                .then((r) => r.json())
                .then((data: DisplaySession) => {
                  if (data.clinics?.name) {
                    setClinicName(data.clinics.name);
                  }
                })
                .catch(() => {});
            }
            // If session expired
            if (newData.status === "expired") {
              localStorage.removeItem(STORAGE_KEY);
              setSessionId(null);
              setPairingCode(null);
              setIsPaired(false);
              setClinicId(null);
              createSession();
            }
          },
        )
        .subscribe();

      sessionChannelRef.current = channel;
    },
    [createSession],
  );

  const subscribeToQueue = useCallback((cId: string) => {
    // Clean up existing subscription
    if (queueChannelRef.current) {
      supabase.removeChannel(queueChannelRef.current);
    }

    const fetchQueueData = async () => {
      try {
        const res = await fetch(`/api/queue?clinic_id=${cId}`);
        if (!res.ok) return;
        const data = await res.json();
        const queue: QueueEntry[] = data.queue ?? [];
        setServingEntry(
          queue.find((e) => e.status === "serving") ?? null,
        );
        setWaitingQueue(
          queue
            .filter((e) => e.status === "waiting")
            .sort((a, b) => a.token_number - b.token_number),
        );
      } catch {
        // silent
      }
    };

    // Initial fetch
    fetchQueueData();

    const channel = supabase
      .channel(`display-queue-${cId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue",
          filter: `clinic_id=eq.${cId}`,
        },
        () => {
          fetchQueueData();
        },
      )
      .subscribe();

    queueChannelRef.current = channel;
  }, []);

  /* ── Initialize on mount ────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setIsLoading(true);

      // Check localStorage for existing session
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const session = await fetchSession(storedId);
        if (session && !cancelled) {
          if (session.status === "paired" && session.clinic_id) {
            // Already paired — go straight to queue view
            setSessionId(session.id);
            setClinicId(session.clinic_id);
            setClinicName(session.clinics?.name ?? "");
            setIsPaired(true);
            setPairingCode(session.pairing_code);
            startHeartbeat(session.id);
            subscribeToQueue(session.clinic_id);
            setIsLoading(false);
            return;
          }

          if (session.status === "unpaired") {
            // Session exists but unpaired — show the code
            setSessionId(session.id);
            setPairingCode(session.pairing_code);
            setIsPaired(false);
            startHeartbeat(session.id);
            subscribeToSession(session.id);
            setIsLoading(false);
            return;
          }
        }

        // Session expired or not found — fall through to create new
        localStorage.removeItem(STORAGE_KEY);
      }

      // Create a new session
      if (!cancelled) {
        await createSession();
      }
    };

    init().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Effect: Start subscriptions & heartbeat when sessionId changes ─── */

  useEffect(() => {
    if (!sessionId) return;

    startHeartbeat(sessionId);
    subscribeToSession(sessionId);

    return () => {
      stopHeartbeat();
      if (sessionChannelRef.current) {
        supabase.removeChannel(sessionChannelRef.current);
        sessionChannelRef.current = null;
      }
      if (queueChannelRef.current) {
        supabase.removeChannel(queueChannelRef.current);
        queueChannelRef.current = null;
      }
    };
  }, [sessionId, startHeartbeat, stopHeartbeat, subscribeToSession]);

  /* ── Effect: Subscribe to queue when clinicId changes ───────────────── */

  useEffect(() => {
    if (!isPaired || !clinicId) return;
    subscribeToQueue(clinicId);

    return () => {
      if (queueChannelRef.current) {
        supabase.removeChannel(queueChannelRef.current);
        queueChannelRef.current = null;
      }
    };
  }, [isPaired, clinicId, subscribeToQueue]);

  /* ── Effect: Update clock every minute ──────────────────────────────── */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, CLOCK_UPDATE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  /* ── Loading state ──────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-white/60" />
          <p className="text-sm text-white/40">Initializing display…</p>
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────────────────── */

  if (error && !pairingCode && !sessionId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#171717]">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <WifiOff className="size-10 text-white/40" />
          <h1 className="text-lg font-semibold text-white/80">
            Connection Error
          </h1>
          <p className="text-sm text-white/50">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              createSession().finally(() => setIsLoading(false));
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm text-white/70 transition-colors hover:bg-white/20"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── State A: Unpaired (show pairing code) ──────────────────────────── */

  if (!isPaired) {
    const qrData = sessionId
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/display?session_id=${sessionId}`
      : "";

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#171717] px-4">
        {/* Pairing Code */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-white/30">
            Pairing Code
          </p>
          <p
            className="font-mono text-[96px] font-bold tracking-[0.2em] text-white leading-none"
            aria-label={`Pairing code: ${pairingCode ?? "———"}`}
          >
            {pairingCode ?? "————"}
          </p>
        </div>

        {/* QR Code */}
        {qrData && (
          <div className="mt-10 overflow-hidden rounded-xl bg-white p-3 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
              alt="QR code to pair this display"
              width={200}
              height={200}
              className="size-48 sm:size-[200px]"
            />
          </div>
        )}

        {/* Instruction */}
        <p className="mt-8 text-sm text-white/35 tracking-wide">
          Enter this code on the staff page
        </p>

        {/* Session ID (hidden, for debugging) */}
        {pairingCode && (
          <p className="mt-2 text-[10px] text-white/15 font-mono">
            Session: {sessionId?.slice(0, 8)}…
          </p>
        )}
      </div>
    );
  }

  /* ── State B: Paired (queue display) ────────────────────────────────── */

  const nextWaiting =
    waitingQueue.length > 0 ? waitingQueue[0] : null;
  const nextThreeWaiting = waitingQueue.slice(0, 3);
  const totalWaiting = waitingQueue.length;

  return (
    <div ref={displayRef} className="flex min-h-dvh flex-col bg-canvas-soft">
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-hairline bg-canvas px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">{clinicName}</h1>
        <div className="flex items-center gap-3">
          <time
            className="font-mono text-sm tabular-nums text-body"
            dateTime={currentTime.toISOString()}
          >
            {formatTime(currentTime)}
          </time>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-body transition-colors hover:bg-hairline hover:text-ink"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </header>

      {/* ── Center Hero ──────────────────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {servingEntry ? (
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-mute">
              Now Serving
            </p>
            <p className="mt-2 font-mono text-[120px] font-bold leading-none tracking-tight text-ink">
              #{servingEntry.token_number}
            </p>
            <p className="mt-4 text-2xl font-medium text-body">
              {servingEntry.patient_name}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-mute">
              Next
            </p>
            {nextWaiting ? (
              <>
                <p className="mt-2 font-mono text-[120px] font-bold leading-none tracking-tight text-ink">
                  #{nextWaiting.token_number}
                </p>
                <p className="mt-4 text-2xl font-medium text-body">
                  {nextWaiting.patient_name}
                </p>
              </>
            ) : (
              <>
                <p className="mt-8 text-2xl font-medium text-mute">
                  {totalWaiting > 0
                    ? "Preparing queue…"
                    : "No patients in queue"}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Bottom: Next 3 Waiting ───────────────────────────────────── */}
      <footer className="border-t border-hairline bg-canvas px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
              Next 3 Waiting
            </p>
            {nextThreeWaiting.length > 0 ? (
              <div className="flex items-center gap-2">
                {nextThreeWaiting.map((entry) => (
                  <span
                    key={entry.id}
                    className="inline-flex items-center rounded-lg border border-hairline bg-canvas-soft px-4 py-2 font-mono text-lg font-semibold tabular-nums text-ink"
                  >
                    #{entry.token_number}
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-mono text-sm text-mute">
                {totalWaiting === 0
                  ? "Queue is empty"
                  : "No more waiting patients"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium uppercase tracking-wider text-mute">
              Total Waiting
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">
              {totalWaiting}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
