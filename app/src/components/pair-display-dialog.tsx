"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Monitor,
  CheckCircle2,
  Loader2,
  X,
  ScanLine,
  Keyboard,
  CameraOff,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PairDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClinicId: string;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const QR_SCANNER_ID = "qr-display-scanner";

/* ── Component ──────────────────────────────────────────────────────────── */

export function PairDisplayDialog({
  open,
  onOpenChange,
  defaultClinicId,
}: PairDisplayDialogProps) {
  const [pairMethod, setPairMethod] = useState<"scan" | "code">("scan");
  const [pairingCode, setPairingCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const prevOpenRef = useRef(open);

  /* ── Reset state when dialog opens ──────────────────────────────────── */

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setPairingCode("");
      setPairMethod("scan");
      setSuccess(false);
      setErrorMessage(null);
      setCameraAvailable(null);
    }
    prevOpenRef.current = open;
  }, [open]);

  /* ── QR Scanner lifecycle ───────────────────────────────────────────── */

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!open || success) return;

    if (pairMethod !== "scan") return;

    let cancelled = false;
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(QR_SCANNER_ID);
        scannerRef.current = scanner;
        if (mounted) setCameraAvailable(true);
        if (mounted) setScanning(true);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (cancelled) return;
            if (scannerRef.current) {
              try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {}
              scannerRef.current = null;
            }
            if (mounted) setScanning(false);

            try {
              const url = new URL(decodedText);
              const sid = url.searchParams.get("session_id");
              if (sid) {
                if (mounted) setIsSubmitting(true);
                if (mounted) setErrorMessage(null);

                const res = await fetch("/api/display/pair", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ session_id: sid }),
                });

                const data = await res.json();

                if (!res.ok) {
                  throw new Error(data.error || "Failed to pair display");
                }

                if (!cancelled && mounted) {
                  setSuccess(true);
                  setTimeout(() => onOpenChange(false), 2000);
                }
              }
            } catch (err) {
              if (!cancelled && mounted) {
                setErrorMessage(
                  err instanceof Error ? err.message : "Failed to pair display",
                );
              }
            } finally {
              if (!cancelled && mounted) setIsSubmitting(false);
            }
          },
          () => {
            // Scan failure — ignore (keeps scanning)
          },
        );
      } catch {
        if (!cancelled && mounted) {
          setCameraAvailable(false);
          setScanning(false);
          setPairMethod("code");
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      mounted = false;
      if (scannerRef.current) {
        try { scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, [open, pairMethod, success, onOpenChange]);

  /* ── Manual code pairing ────────────────────────────────────────────── */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pairingCode.length !== 4) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch("/api/display/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: pairingCode.trim(),
          clinic_id: defaultClinicId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to pair display");
      }

      setSuccess(true);
      setTimeout(() => onOpenChange(false), 2000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to pair display",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPairingCode(digits);
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-hairline bg-canvas shadow-level-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Monitor className="size-5" aria-hidden="true" />
            Pair a Display Screen
          </DialogTitle>
          <DialogDescription className="text-sm text-body">
            {pairMethod === "scan"
              ? "Scan the QR code shown on the waiting room TV"
              : "Enter the 4-digit code shown on the waiting room TV"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogPanel>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="rounded-full bg-emerald-50 p-3">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-emerald-700">
                  Display paired successfully!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Method toggle */}
                {cameraAvailable !== false && (
                  <div className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas-soft/50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        setPairMethod("scan");
                        setErrorMessage(null);
                      }}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        pairMethod === "scan"
                          ? "bg-canvas text-ink shadow-level-1"
                          : "text-body hover:text-ink"
                      }`}
                    >
                      <ScanLine className="size-4" aria-hidden="true" />
                      Scan QR
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopScanner();
                        setPairMethod("code");
                        setErrorMessage(null);
                      }}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        pairMethod === "code"
                          ? "bg-canvas text-ink shadow-level-1"
                          : "text-body hover:text-ink"
                      }`}
                    >
                      <Keyboard className="size-4" aria-hidden="true" />
                      Enter Code
                    </button>
                  </div>
                )}

                {/* QR Scanner */}
                {pairMethod === "scan" && (
                  <div className="flex flex-col items-center gap-3">
                    <div
                      id={QR_SCANNER_ID}
                      className="w-full max-w-xs overflow-hidden rounded-lg border border-hairline bg-black"
                      style={{ aspectRatio: "1 / 1" }}
                    />
                    {scanning && (
                      <p className="flex items-center gap-2 text-xs text-mute">
                        <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Waiting for QR code…
                      </p>
                    )}
                  </div>
                )}

                {/* Manual code input */}
                {pairMethod === "code" && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="pairing-code"
                      className="text-sm font-medium text-ink"
                    >
                      Pairing Code
                    </label>
                    <input
                      id="pairing-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="0000"
                      value={pairingCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      disabled={isSubmitting}
                      autoComplete="off"
                      className="h-14 w-full rounded-lg border border-hairline bg-canvas-soft text-center font-mono text-3xl font-bold tracking-[0.2em] text-ink placeholder:text-mute/40 focus:border-link focus:shadow-level-2 outline-none transition-shadow"
                      aria-label="4-digit pairing code"
                    />
                    {cameraAvailable === false && (
                      <p className="flex items-center gap-1.5 text-xs text-body">
                        <CameraOff className="size-3.5" aria-hidden="true" />
                        Camera not available — enter the code manually
                      </p>
                    )}
                  </div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <p
                    className="flex items-center gap-1.5 text-sm text-red-600"
                    role="alert"
                  >
                    <X className="size-3.5 shrink-0" aria-hidden="true" />
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </DialogPanel>

          <DialogFooter className="flex items-center justify-end gap-2 px-6 py-4 sm:flex-row">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!success && pairMethod === "code" && (
              <Button
                variant="default"
                type="submit"
                loading={isSubmitting}
                disabled={pairingCode.length !== 4 || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Pairing…
                  </>
                ) : (
                  <>
                    <Monitor className="size-4" aria-hidden="true" />
                    Pair
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
