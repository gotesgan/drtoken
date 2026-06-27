"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    // Supabase stores the session from the reset link in the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="size-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Password reset successful</h1>
          <p className="mt-1 text-sm text-gray-500">Your password has been updated.</p>
          <a href="/login" className="mt-6 inline-block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-gray-800 transition-all">
            Sign in with new password
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Dr. Token System" className="mx-auto mb-4 w-24 h-auto object-contain" />
          <h1 className="text-xl font-semibold text-gray-900">Set new password</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New Password</label>
            <input id="new-password" type="password" autoComplete="new-password" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="At least 6 characters" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required minLength={6}
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Repeat your password" />
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in" role="alert">{error}</div>}

          <button type="submit" disabled={loading || !password || !confirm}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-[0.98]">
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
