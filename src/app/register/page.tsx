"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

function RegisterContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to complete registration. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage("Student account created successfully! You can now sign in.");
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col justify-center items-center font-sans pt-safe pb-safe px-4 py-8 selection:bg-[#2E3AE3] selection:text-white relative overflow-hidden">
      {/* Soft ambient background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-72 bg-gradient-to-b from-[#E4EAFA] via-[#EEF2FC] to-transparent pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-sm sm:max-w-md my-auto pt-6 pb-4">
        {/* White Card Box with Floating Logo on Top Edge */}
        <div className="relative bg-white rounded-3xl p-6 sm:p-8 pt-10 sm:pt-11 shadow-[0_12px_45px_-8px_rgba(30,41,59,0.1)] border border-slate-100">
          
          {/* FLOATING LOGO AT TOP OF BOX */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E3AE3] to-[#1D2696] text-white shadow-xl shadow-[#2E3AE3]/35 ring-4 ring-[#F4F6FB] active:scale-95 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-white">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
          </div>

          {/* Header Inside Card */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-black tracking-tight text-[#1F2227]">
                IIITH PREP
              </span>
              <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-black text-[#2E3AE3] uppercase tracking-wider border border-[#2E3AE3]/20">
                UGEE & SPEC
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-black text-[#1F2227] tracking-tight">
              Create Account 🚀
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-medium">
              Join IIITH Entrance Prep to practice authentic timed CBT mock tests
            </p>
          </div>

          {/* Form Body Inside Card */}
          <div className="mt-6 space-y-4">
            {/* Success Notification */}
            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-semibold text-emerald-800 animate-in fade-in leading-relaxed">
                <p className="font-bold text-emerald-900">✓ Account Created Successfully!</p>
                <p className="mt-1">{message}</p>
                <div className="mt-3">
                  <Link
                    href="/login"
                    prefetch={true}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase text-white inline-block hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Proceed to Sign In &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* Error message */}
            {message && !success && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed flex items-start gap-2">
                <span className="text-sm shrink-0">⚠️</span>
                <span>{message}</span>
              </div>
            )}

            {/* Social Sign-In */}
            <GoogleOAuthButton disabled={loading} role="student" />

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold text-slate-400 lowercase tracking-wider">
                or register with email
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Form */}
            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L1 7" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-4 focus:ring-[#2E3AE3]/10 transition-all font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-11 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-4 focus:ring-[#2E3AE3]/10 transition-all font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl h-13 text-sm font-black text-white bg-[#2E3AE3] hover:bg-[#252fb8] shadow-lg shadow-[#2E3AE3]/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account &rarr;</span>
                )}
              </button>
            </form>
          </div>

          {/* Footer Inside Card */}
          <div className="mt-6 text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                prefetch={true}
                className="font-black text-[#2E3AE3] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Subtle Bottom Trust Label */}
      <p className="text-center text-[11px] text-slate-400 font-medium">
        IIITH UGEE & SPEC Authentic CBT Simulation
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E3AE3] border-t-transparent" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
