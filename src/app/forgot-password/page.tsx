"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RecoveryStep = "email" | "otp";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryError = searchParams.get("recoveryError");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<RecoveryStep>("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    recoveryError
      ? "We couldn't verify the recovery request. Please request a new code."
      : "",
  );

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (error) {
        console.error("Password recovery OTP request failed:", error);
        setMessage(
          "We couldn't send a verification code. Check the email address and try again shortly.",
        );
        return;
      }

      setEmail(normalizedEmail);
      setStep("otp");
      setMessage(
        "If an account exists for this email, a verification code has been sent. Check your inbox and spam folder.",
      );
    } catch (error) {
      console.error("Password recovery OTP request failed:", error);
      setMessage("We couldn't send a verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "recovery",
      });

      if (error) {
        console.error("Password recovery OTP verification failed:", error);
        setMessage("That code is invalid or expired. Check the code or request a new one.");
        return;
      }

      router.replace("/update-password?recovery=1");
      router.refresh();
    } catch (error) {
      console.error("Password recovery OTP verification failed:", error);
      setMessage("We couldn't verify the code. Please try again.");
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
            {step === "email" ? "Forgot your password?" : "Verify your email"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {step === "email"
              ? "Enter your registered email address and we’ll send you a verification code."
              : `Enter the verification code sent to ${email} to continue resetting your password.`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-5 p-6 sm:p-8">
            {message && (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-900">
                {message}
              </div>
            )}
            <div>
              <label htmlFor="recovery-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
              {loading ? "Sending code…" : "Send OTP"}
            </button>
            <div className="text-center text-sm">
              <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-900">
                ← Back to sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5 p-6 sm:p-8">
            {message && (
              <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm leading-relaxed text-blue-900">
                {message}
              </div>
            )}
            <div>
              <label htmlFor="recovery-otp" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email verification code
              </label>
              <input
                id="recovery-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={10}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\s/g, ""))}
                placeholder="Enter the code from your email"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-center text-lg tracking-[0.3em] text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !otp.trim()}
              className="w-full rounded-xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-blue-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verifying code…" : "Verify OTP"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setStep("email");
                setOtp("");
                setMessage("");
              }}
              className="w-full text-sm font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
            >
              Use a different email address
            </button>
            <div className="text-center text-sm">
              <Link href="/login" className="font-semibold text-slate-500 hover:text-slate-800">
                ← Back to sign in
              </Link>
            </div>
          </form>
        )}
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
