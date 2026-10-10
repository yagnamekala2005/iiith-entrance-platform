"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const recoveryError = searchParams.get("recoveryError");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(
    recoveryError
      ? "We couldn't verify that recovery link. Request a new link and open the latest email."
      : "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSent(false);

    try {
      const supabase = createClient();
      const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      const appOrigin = (configuredOrigin || window.location.origin).replace(/\/$/, "");
      const callbackUrl = new URL("/auth/callback", appOrigin);
      callbackUrl.searchParams.set("flow", "recovery");
      callbackUrl.searchParams.set("next", "/update-password");

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: callbackUrl.toString() },
      );

      if (error) {
        console.error("Password recovery request failed:", error);
        setMessage(
          "We couldn't send the recovery email right now. Check the email address and try again.",
        );
        return;
      }

      setSent(true);
      setMessage(
        "If an account exists for that email address, a password-reset link will arrive shortly. Check your inbox and spam folder.",
      );
    } catch (error) {
      console.error("Password recovery request failed:", error);
      setMessage("We couldn't send the recovery email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl">
        <div className="bg-slate-900 p-6 text-white sm:p-8">
          <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
            Account Recovery
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Enter the email address associated with your account. We’ll send you a secure link to choose a new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
          {message && (
            <div
              role={sent ? "status" : "alert"}
              className={`rounded-xl border p-3.5 text-sm leading-relaxed ${
                sent
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              {message}
            </div>
          )}

          <div>
            <label
              htmlFor="recovery-email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Registered email address
            </label>
            <input
              id="recovery-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending recovery link…" : "Send password reset link"}
          </button>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-white">
          Loading account recovery…
        </main>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
