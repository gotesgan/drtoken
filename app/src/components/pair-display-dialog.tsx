"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Monitor, CheckCircle2, Loader2, X } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Clinic {
  id: string;
  name: string;
}

interface PairDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClinicId: string;
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function PairDisplayDialog({
  open,
  onOpenChange,
  defaultClinicId,
}: PairDisplayDialogProps) {
  const [pairingCode, setPairingCode] = useState("");
  const [selectedClinicId, setSelectedClinicId] = useState(defaultClinicId);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const prevOpenRef = useRef(open);

  // Fetch clinics list
  useEffect(() => {
    if (!open) return;
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data: Clinic[]) => setClinics(data))
      .catch(() => {});
  }, [open]);

  // Reset state when dialog opens (detect transition from closed → open)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setPairingCode("");
      setSelectedClinicId(defaultClinicId);
      setSuccess(false);
      setErrorMessage(null);
    }
    prevOpenRef.current = open;
  }, [open, defaultClinicId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pairingCode.trim() || pairingCode.length !== 4 || !selectedClinicId) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch("/api/display/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: pairingCode.trim(),
          clinic_id: selectedClinicId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to pair display");
      }

      setSuccess(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to pair display",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits, max 4
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPairingCode(digits);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border border-hairline bg-canvas p-6 shadow-level-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Monitor className="size-5" aria-hidden="true" />
            Pair a Display Screen
          </DialogTitle>
          <DialogDescription className="text-sm text-body">
            Enter the 4-digit code shown on the waiting room TV
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogPanel>
            <div className="flex flex-col gap-5">
              {/* Success state */}
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
                <>
                  {/* 4-digit code input */}
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
                  </div>

                  {/* Clinic selector */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="clinic-select"
                      className="text-sm font-medium text-ink"
                    >
                      Clinic
                    </label>
                    <Select
                      value={selectedClinicId}
                      onValueChange={(value) =>
                        setSelectedClinicId(value as string)
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="clinic-select"
                        className="w-full"
                      >
                        <SelectValue placeholder="Select a clinic" />
                      </SelectTrigger>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                </>
              )}
            </div>
          </DialogPanel>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!success && (
              <Button
                variant="default"
                type="submit"
                loading={isSubmitting}
                disabled={
                  pairingCode.length !== 4 || !selectedClinicId || success
                }
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
