"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_failed" ? "Authentication failed. Please try again." : null,
  );
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectParam || "/app");
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh">
      {/* ── Left: Brand panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 relative overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-purple-500/10 blur-3xl animate-pulse [animation-delay:2s]" />

        <div className="relative z-10 text-center max-w-md animate-[fadeIn_0.8s_ease-out]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Dr. Token System"
            className="mx-auto mb-6 w-40 h-auto object-contain drop-shadow-lg"
          />
          <p className="mt-3 text-base text-gray-400 leading-relaxed">
            Streamline your hospital queue management. Add patients, call tokens,
            and serve faster — all from one dashboard.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4 text-left">
            {[
              { label: "Real-time queue", desc: "Live updates across all devices" },
              { label: "Role-based access", desc: "Staff, doctors, and admins" },
              { label: "Display screens", desc: "Pair with waiting room TVs" },
            ].map((f, i) => (
              <div
                key={f.label}
                className="flex items-start gap-3 animate-[fadeIn_0.6s_ease-out]"
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

      {/* ── Right: Login form ────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-[fadeIn_0.6s_ease-out]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Dr. Token System"
              className="mx-auto mb-3 w-24 h-auto object-contain"
            />
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                placeholder="you@clinic.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
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

            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-[fadeIn_0.3s_ease-out]"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <a href="/forgot-password" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            No account?{" "}
            <a href="/register" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
              Register your clinic
            </a>
          </p>

          <div className="mt-8 flex items-center justify-between text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} Dr. Token System. All rights reserved.</p>
            <a
              href="https://pixelperfects.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"
            >
              Powered by
              <img
                src="https://media.pixelperfects.in/pixelperfect03.png"
                alt="PixelPerfect"
                className="h-4 w-auto inline-block"
              />
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
