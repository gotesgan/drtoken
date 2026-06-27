"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [step, setStep] = useState<"account" | "clinic">("account");

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("step") === "clinic") {
        setStep("clinic");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newUserId, setNewUserId] = useState<string | null>(null);

  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() || email.split("@")[0] },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Store user ID for step 2
    if (data.user) {
      setNewUserId(data.user.id);
    }

    setStep("clinic");
    setLoading(false);
  };

  const handleSetupClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const clinicRes = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicName.trim(),
          address: clinicAddress.trim() || undefined,
          phone: clinicPhone.trim() || undefined,
        }),
      });

      if (!clinicRes.ok) {
        const errData = await clinicRes.json();
        throw new Error(errData.error || "Failed to create clinic");
      }

      const clinic = await clinicRes.json();

      const uid = newUserId;
      if (!uid) throw new Error("User ID not found. Please try again.");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          clinic_id: clinic.id,
          role: "admin",
          display_name: displayName.trim() || email.split("@")[0],
        })
        .eq("id", uid);

      if (profileError) throw profileError;

      const settingsRes = await fetch("/api/clinic-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinic.id }),
      });

      if (!settingsRes.ok) {
        const errData = await settingsRes.json();
        throw new Error(errData.error || "Failed to create settings");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during setup");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh">
      {/* ── Left: Brand panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse [animation-delay:2s]" />

        <div className="relative z-10 text-center max-w-md animate-fade-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Dr. Token System"           className="mx-auto mb-6 w-40 h-auto object-contain drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Dr. Token System</h1>
          <p className="mt-3 text-base text-gray-400 leading-relaxed">
            Set up your clinic in minutes. Create your admin account and start managing your queue.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4 text-left">
            {[
              { label: "Live queue tracking", desc: "Real-time updates for patients and staff" },
              { label: "Role-based access", desc: "Doctors, receptionists, and admins" },
              { label: "Display screens", desc: "Pair with waiting room TVs via QR" },
              { label: "Secure & private", desc: "Your data stays within your clinic" },
            ].map((f, i) => (
              <div
                key={f.label}
                className="flex items-start gap-3 animate-fade-in"
                style={{ animationDelay: `${0.3 + i * 0.15}s`, animationFillMode: "both" }}
              >
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg className="size-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Dr. Token System"             className="mx-auto mb-3 w-24 h-auto object-contain" />
            <h1 className="text-xl font-semibold text-gray-900">Register Your Clinic</h1>
            <p className="mt-1 text-sm text-gray-500">
              {step === "account" ? "Create your admin account" : "Set up your clinic details"}
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Get started</h2>
            <p className="mt-1 text-sm text-gray-500">
              {step === "account" ? "Create your admin account" : "Set up your clinic details"}
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className={`size-2 rounded-full transition-colors duration-300 ${step === "account" ? "bg-gray-900" : "bg-gray-300"}`} />
            <span className="h-px w-8 bg-gray-300" />
            <span className={`size-2 rounded-full transition-colors duration-300 ${step === "clinic" ? "bg-gray-900" : "bg-gray-300"}`} />
          </div>

          {/* Step 1: Account */}
          {step === "account" && (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">Your Name</label>
                <input id="display-name" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  placeholder="Dr. Smith" />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <input id="reg-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  placeholder="admin@clinic.com" />
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input id="reg-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    placeholder="At least 6 characters" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700">Confirm Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input id="reg-confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                    placeholder="Repeat your password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}>
                    {showConfirm ? (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 animate-fade-in" role="status">{message}</div>}
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in" role="alert">{error}</div>}

              <button type="submit" disabled={loading || !email || !password || !confirmPassword}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating account...
                  </span>
                ) : "Create Account"}
              </button>
            </form>
          )}

          {/* Step 2: Clinic */}
          {step === "clinic" && (
            <form onSubmit={handleSetupClinic} className="space-y-5 animate-fade-in">
              <div>
                <label htmlFor="clinic-name" className="block text-sm font-medium text-gray-700">Clinic / Hospital Name <span className="text-red-500">*</span></label>
                <input id="clinic-name" type="text" required value={clinicName} onChange={(e) => setClinicName(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  placeholder="City Hospital" />
              </div>
              <div>
                <label htmlFor="clinic-address" className="block text-sm font-medium text-gray-700">Address</label>
                <textarea id="clinic-address" rows={2} value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200 resize-none"
                  placeholder="123 Main Street, City" />
              </div>
              <div>
                <label htmlFor="clinic-phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input id="clinic-phone" type="tel" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  placeholder="+91 98765 43210" />
              </div>

              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in" role="alert">{error}</div>}

              <button type="submit" disabled={loading || !clinicName.trim()}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Setting up clinic...
                  </span>
                ) : "Complete Setup"}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
