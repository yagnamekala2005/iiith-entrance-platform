"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(false), 5000);
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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create the account. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage(
        "Account created successfully! You can now sign in with your email and password."
      );
      setEmail("");
      setPassword("");
    } catch {
      setMessage("Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Entrance Portal</span>
          </Link>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              NEW STUDENT REGISTRATION
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create an Account
            </h1>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Join IIITH Entrance Prep to practice questions across Maths, Physics, Chemistry, and Aptitude, and take full CBT mock tests.
            </p>
          </div>

          {/* Success Notification */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in leading-relaxed">
              <p className="font-bold text-emerald-900">✓ Account Created Successfully!</p>
              <p className="mt-1">{message}</p>
              <div className="mt-3">
                <Link
                  href="/login"
                  className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold uppercase text-white inline-block hover:bg-emerald-800"
                >
                  Proceed to Sign In &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Error message */}
          {message && !success && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
              ⚠️ {message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="email">
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
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="password">
                Create Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 pr-12 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Must be at least 6 characters long.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Creating your account..." : "Register Account &rarr;"}
            </button>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Already have an account?{" "}
              <Link className="font-bold text-blue-700 hover:text-blue-900" href="/login">
                Sign in here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
