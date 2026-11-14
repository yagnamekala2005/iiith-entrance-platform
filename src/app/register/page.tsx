"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

function RegisterContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(false), 8000);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSuccess(false);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setSuccess(false);
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          role: "student",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create the account. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage("Student account created successfully! You can now sign in to start practicing.");
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans pt-safe pb-safe px-4 sm:px-6">
      {/* Top Branding Header */}
      <div className="w-full max-w-sm mx-auto pt-6 sm:pt-10 text-center">
        {/* App Icon Badge */}
        <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#2E3AE3] text-white font-black text-xl sm:text-2xl shadow-lg shadow-[#2E3AE3]/30 tracking-tight">
          II
        </div>

        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#1F2227]">
          Create Account
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#2E3AE3] uppercase tracking-wider">
          Student Registration
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-sm mx-auto my-auto py-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl space-y-4">
          {/* Success Notification */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 animate-in fade-in leading-relaxed">
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
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
              {message}
            </div>
          )}

          {/* Social Sign-In */}
          <div>
            <GoogleOAuthButton disabled={loading} role="student" />
          </div>

          <div className="flex items-center gap-3 py-0.5">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              or email
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Form */}
          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-2 focus:ring-[#2E3AE3]/15 transition-all font-medium placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-2 focus:ring-[#2E3AE3]/15 transition-all font-medium placeholder:text-slate-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#2E3AE3] hover:bg-[#252fb8] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#2E3AE3]/25 transition-all active:scale-98 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register & Start Practicing</span>
              )}
            </button>
          </form>
        </div>

        {/* Sign In Link */}
        <p className="mt-4 text-center text-xs text-slate-500 font-medium">
          Already have an account?{" "}
          <Link
            href="/login"
            prefetch={true}
            className="font-bold text-[#2E3AE3] hover:underline"
          >
            Sign In &rarr;
          </Link>
        </p>
      </div>

      {/* Bottom Subtle Tagline */}
      <div className="w-full max-w-sm mx-auto pb-4 text-center text-[11px] text-slate-400 font-medium">
        IIITH UGEE & SPEC Authentic CBT Simulation
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E3AE3] border-t-transparent" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
