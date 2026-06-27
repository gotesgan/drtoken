"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-dvh">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative z-10 text-center max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Dr. Token System" className="mx-auto mb-6 w-40 h-auto object-contain drop-shadow-lg" />
          <p className="mt-3 text-base text-gray-400 leading-relaxed">
            Reset your password to regain access to your clinic management dashboard.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Dr. Token System" className="mx-auto mb-3 w-24 h-auto object-contain" />
            <h1 className="text-xl font-semibold text-gray-900">Reset Password</h1>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Forgot password?</h2>
            <p className="mt-1 text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-fade-in" role="status">
                Check your email. If an account exists, we&apos;ve sent you a password reset link.
              </div>
              <a href="/login"
                className="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white text-center shadow-sm hover:bg-gray-800 transition-all">
                Back to Sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email</label>
                <input id="reset-email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="you@clinic.com" />
              </div>

              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in" role="alert">{error}</div>}

              <button type="submit" disabled={loading || !email}
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98]">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <p className="text-center text-sm text-gray-500">
                <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">Back to sign in</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
