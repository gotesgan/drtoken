"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      {/* ═══ NAVBAR ════════════════════════════════════════════════════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Dr. Token System" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-all">Start Free</Link>
          </div>
        </div>
      </header>

      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute -top-40 right-0 size-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-40 left-0 size-[500px] rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm mb-8">
            <span className="flex size-2 rounded-full bg-emerald-500" />
            Trusted by clinics across India
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
            <span className="text-blue-600">Digital Token System</span> for Clinic —<br />
            Patient Queue Management Made Simple
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed">
            Replace manual registers and reception chaos with a digital OPD token system.
            Manage patient queues, reduce waiting time, and give your patients a seamless experience.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="rounded-xl bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all">
              Start Free — No Credit Card
            </Link>
            <Link href="/login" className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              Watch Demo →
            </Link>
          </div>

          <p className="mt-4 text-xs text-gray-400">Free for 1 clinic • No setup fees • Cancel anytime</p>

          <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-gray-200 overflow-hidden shadow-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/demo/app-dashboard.png"
              alt="Dr. Token System Dashboard"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* ═══ LOGO CLOUD ════════════════════════════════════════════════════ */}
      <section className="border-y border-gray-100 bg-gray-50/50 py-10">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-gray-400 mb-6">Trusted by healthcare providers</p>
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm font-semibold text-gray-300">
            {["City Hospital", "Green Valley Clinic", "Lakeside Medical", "Apollo Health", "MediCare Plus"].map((name) => (
              <span key={name} className="text-lg tracking-tight">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM / SOLUTION ════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">The Problem</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Long waiting times, manual registers, crowded reception — sound familiar?
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Every clinic faces the same struggle: managing walk-in patients without chaos.
              A paper register is slow, hard to track, and frustrates everyone.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
            {[
              { title: "Manual Token", desc: "Staff writes names in a register. Patients crowd the desk asking when it's their turn." },
              { title: "No Visibility", desc: "Doctor can't see how many are waiting. Reception can't estimate wait time." },
              { title: "Lost Patients", desc: "Without a calling system, patients wander off. You lose revenue." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-50">
                  <svg className="size-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              The Solution: A digital OPD token system
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ══════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to manage your patient queue
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              A complete OPD queue management system — from token generation to patient display.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Digital Token Generation", desc: "Auto-incrementing tokens per clinic per day. No more paper registers.", icon: "🔢" },
              { title: "Patient Queue Display", desc: "Big-screen TV view showing Now Serving and next 3 waiting. Perfect for waiting rooms.", icon: "🖥️" },
              { title: "Patient Self Check-in", desc: "Patients enter their phone and see their position. No crowding at reception.", icon: "📱" },
              { title: "Real-time Updates", desc: "Supabase Realtime pushes changes instantly. No page refresh needed.", icon: "⚡" },
              { title: "QR Code Access", desc: "Patients scan a QR to check their token on their phone. No app download.", icon: "📷" },
              { title: "OPD Open/Close", desc: "Toggle OPD status. Stop accepting new patients when doctor is busy.", icon: "🚪" },
              { title: "Role-based Access", desc: "Admin, Doctor, Receptionist — each with appropriate permissions.", icon: "👥" },
              { title: "Call / Skip / Complete", desc: "One-click actions to manage the queue. Call next, skip, or mark complete.", icon: "✅" },
              { title: "Daily Summary", desc: "See patients served, average wait time, and queue stats at a glance.", icon: "📊" },
              { title: "Queue History", desc: "Browse any day's queue data. Useful for reporting and audits.", icon: "📅" },
              { title: "Display Screen Pairing", desc: "Pair your waiting room TV with a simple QR code. No complex setup.", icon: "🖥️" },
              { title: "Multi-clinic Support", desc: "Manage multiple clinics or departments from one dashboard.", icon: "🏥" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SCREENSHOTS ═══════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              See it in action
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Clean, intuitive interface designed for clinic staff.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl space-y-12">
            {[
              { title: "Staff Queue Dashboard", desc: "Add patients, call next, skip, or complete — all from one screen. Real-time updates, search, and filters.", img: "app-dashboard" },
              { title: "Waiting Room Display", desc: "Big-screen view showing Now Serving and next waiting tokens. Auto-refreshes 24/7.", img: "tv-display" },
              { title: "Patient Token Lookup", desc: "Patients enter their phone number and see their exact position in the queue.", img: "token-lookup" },
              { title: "Queue History & Reports", desc: "Browse any day's data. Useful for audits, patient volume analysis, and reporting.", img: "history" },
            ].map((s, i) => (
              <div key={s.title} className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 items-center`}>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="aspect-video rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/demo/${s.img}.png`}
                      alt={s.title}
                      className="size-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-gray-500">Get started in 5 minutes.</p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Create Account", desc: "Register your clinic. First user gets admin access." },
              { step: "2", title: "Add Staff", desc: "Invite doctors and receptionists with role-based permissions." },
              { step: "3", title: "Start Queue", desc: "Open OPD, add patients, and call tokens. That's it." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white">{s.step}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BLOG / KEYWORDS ════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Resources</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Learn about OPD token systems
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "How to Reduce OPD Waiting Time", desc: "Practical strategies to cut patient wait times using a digital token system." },
              { title: "Manual Token vs Digital Token System", desc: "Why paper registers are costing you patients — and how going digital fixes it." },
              { title: "10 Signs Your Clinic Needs Queue Management", desc: "Is your reception overwhelmed? Here are the warning signs." },
              { title: "Can a Digital Token System Replace a Receptionist?", desc: "How automation handles check-ins so your staff can focus on patients." },
              { title: "Best Way to Manage Walk-in Patients", desc: "A step-by-step guide to handling unscheduled patients efficiently." },
              { title: "What is an OPD Token System?", desc: "Everything you need to know about digital token systems for outpatient departments." },
            ].map((post) => (
              <div key={post.title} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">{post.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ════════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to digitize your clinic queue?
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Join clinics using Dr. Token System to manage patient queues. Free to start.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-900 shadow-lg hover:bg-gray-100 transition-all">
              Start Free — No Credit Card
            </Link>
            <Link href="/login" className="rounded-xl border border-gray-600 px-8 py-3.5 text-base font-semibold text-gray-300 hover:bg-white/5 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Dr. Token System" className="h-8 w-auto" />
              <p className="mt-3 text-sm text-gray-500">Queue management for clinics and hospitals.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Product</p>
              <div className="mt-3 space-y-2">
                {["Digital Token System", "Patient Queue Management", "OPD Token System", "Clinic Appointment System"].map((l) => (
                  <p key={l} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Resources</p>
              <div className="mt-3 space-y-2">
                {["Blog", "Documentation", "API", "Pricing"].map((l) => (
                  <p key={l} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">{l}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Company</p>
              <div className="mt-3 space-y-2">
                {["About", "Contact", "Privacy", "Terms"].map((l) => (
                  <p key={l} className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer">{l}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Dr. Token System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
