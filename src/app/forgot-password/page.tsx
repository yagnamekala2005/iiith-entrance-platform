"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address and try again.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        (process.env.NODE_ENV === "production"
          ? "https://mocktest-kappa-nine.vercel.app"
          : window.location.origin);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: new URL("/update-password", siteUrl).toString(),
      });

      if (error) {
        console.error("Password reset email request failed:", error);
        setStatus("error");
        setMessage("We couldn't send a reset link right now. Please try again later.");
        return;
      }

      setStatus("success");
      setMessage(
        "If an account exists for this email, we've sent you a password reset link.",
      );
    } catch (error) {
      console.error("Password reset email request failed:", error);
      setStatus("error");
      setMessage("We couldn't send a reset link right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden w-full max-w-full">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 max-w-[90vw] rounded-full bg-blue-600/10 blur-[90px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        <div className="mb-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Sign In</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl">
          <div className="p-6 sm:p-8 pb-0">
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              ACCOUNT RECOVERY
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Forgot Password
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Enter your email address and we&apos;ll send you a secure password reset link.
            </p>
          </div>

          <div className="p-6 sm:p-8 pt-5 space-y-5">
            {message && (
              <div
                role={status === "error" ? "alert" : "status"}
                className={`rounded-xl p-3.5 text-xs font-semibold animate-in fade-in leading-relaxed ${
                  status === "error"
                    ? "border border-rose-200 bg-rose-50 text-rose-800"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  htmlFor="email-input"
                >
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@example.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link &rarr;</span>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Remember your password?{" "}
              <Link className="font-bold text-blue-700 hover:text-blue-900" href="/login">
                Return to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
