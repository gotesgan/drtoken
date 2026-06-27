"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Loader2 } from "lucide-react";

interface LookupResult {
  entry: {
    id: string;
    token_number: number;
    patient_name: string;
    status: string;
    created_at: string;
  } | null;
  position: number;
  ahead: number;
}

interface Clinic {
  id: string;
  name: string;
}

export default function TokenPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUrlClinicId, setHasUrlClinicId] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount (avoid autoFocus hydration issue)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Read clinic_id from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get("clinic_id");

    const timer = setTimeout(() => {
      setHasUrlClinicId(!!cid);
      if (cid) setClinicId(cid);
      fetch("/api/clinics")
        .then((r) => r.json())
        .then((data: Clinic[]) => {
          setClinics(data);
          if (!cid && data.length > 0) setClinicId(data[0].id);
        })
        .catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleLookup = async () => {
    if (!clinicId || !phone.trim()) return;
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/queue/lookup?clinic_id=${clinicId}&phone=${encodeURIComponent(phone.trim())}`,
      );
      if (!res.ok) throw new Error("Lookup failed");
      const data: LookupResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const STATUS_LABEL: Record<string, string> = {
    waiting: "Waiting",
    serving: "Being Served",
    completed: "Completed",
    skipped: "Skipped",
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Minimal header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 text-center">
        <img src="/logo.png" alt="Dr. Token System" className="mx-auto h-7 w-auto" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-50">
            <Phone className="size-5 text-blue-600" />
          </div>

          <h2 className="text-center text-lg font-semibold text-gray-900">
            Check Your Token
          </h2>
          <p className="mt-1 text-center text-sm text-gray-500">
            Enter your phone number to see your queue position.
          </p>

          {/* Form */}
          <div className="mt-6 space-y-3">
            {/* Clinic — hidden if in URL, else show minimal select */}
            {!hasUrlClinicId && (
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <input
              ref={inputRef}
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500"
            />

            <button
              onClick={handleLookup}
              disabled={!clinicId || !phone.trim() || isLoading}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Looking up...
                </span>
              ) : (
                "Check My Token"
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {searched && !isLoading && result && (
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {result.entry ? (
                <>
                  {/* Token hero */}
                  <div className="border-b border-gray-100 bg-gray-50 px-6 py-6 text-center">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      Token Number
                    </p>
                    <p className="mt-1 text-5xl font-bold tracking-tight text-gray-900">
                      #{result.entry.token_number}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{result.entry.patient_name}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          result.entry.status === "waiting"
                            ? "bg-amber-50 text-amber-700"
                            : result.entry.status === "serving"
                              ? "bg-blue-50 text-blue-700"
                              : result.entry.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABEL[result.entry.status] ?? result.entry.status}
                      </span>
                    </div>

                    {result.entry.status === "waiting" && (
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-2xl font-semibold tabular-nums text-gray-900">
                          {result.position}
                          <span className="text-base font-normal text-gray-500">
                            {" "}
                            / {result.position + result.ahead}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {result.ahead === 0
                            ? "You're next in line!"
                            : `${result.ahead} ${result.ahead === 1 ? "person" : "people"} ahead of you`}
                        </p>
                      </div>
                    )}

                    {result.entry.status === "serving" && (
                      <div className="rounded-lg bg-blue-50 p-3 text-center text-sm font-medium text-blue-700">
                        You are currently being served.
                      </div>
                    )}

                    {result.entry.status === "completed" && (
                      <div className="rounded-lg bg-emerald-50 p-3 text-center text-sm text-emerald-700">
                        Your visit has been completed.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Not found */
                <div className="px-6 py-8 text-center">
                  <p className="text-base font-medium text-gray-900">No Record Found</p>
                  <p className="mt-1 text-sm text-gray-500">
                    No queue entry matches this phone number today.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
