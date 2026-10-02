"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmailAction } from "@/lib/admin/actions";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [directRecoveryUrl, setDirectRecoveryUrl] = useState<string | null>(null);
  const [resetPageUrl, setResetPageUrl] = useState<string | null>(null);

  async function handleSendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");
    setDirectRecoveryUrl(null);
    setResetPageUrl(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setLoading(false);
      setStatus("error");
      setMessage("Please enter your registered email address.");
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const res = await sendPasswordResetEmailAction(normalizedEmail, origin);

    setLoading(false);

    if (!res.success) {
      setStatus("error");
      setMessage(res.error || "Failed to send reset link.");
      return;
    }

    setStatus("success");
    if (res.rateLimited) {
      setMessage(
        `A password reset link was created for "${normalizedEmail}". Because Supabase email rate limits were reached on the server, you can use the direct link below to reset your password immediately:`
      );
    } else {
      setMessage(
        `✉️ Password reset email has been dispatched to "${normalizedEmail}"! Please check your inbox (and Spam/Junk folder). You can also click the button below to set your new password directly:`
      );
    }

    if (res.directRecoveryUrl) {
      setDirectRecoveryUrl(res.directRecoveryUrl);
    }
    if (res.resetPageUrl) {
      setResetPageUrl(res.resetPageUrl);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden w-full max-w-full">
      {/* Background glow contained within screen */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 max-w-[90vw] rounded-full bg-blue-600/10 blur-[90px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Back Link */}
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
              Enter your registered email address below. We will send you a secure link to reset your password in Supabase.
            </p>
          </div>

          <div className="p-6 sm:p-8 pt-5 space-y-5">
            {/* Status Messages */}
            {status === "error" && message && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
                ⚠️ {message}
              </div>
            )}

            {status === "success" && message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in leading-relaxed space-y-3">
                <p>{message}</p>

                <div className="pt-2 border-t border-emerald-200/80 flex flex-col gap-2">
                  {directRecoveryUrl && (
                    <a
                      href={directRecoveryUrl}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 shadow-sm transition-all"
                    >
                      Open Verified Supabase Reset Link &rarr;
                    </a>
                  )}

                  {resetPageUrl && (
                    <Link
                      href={resetPageUrl}
                      className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800 shadow-sm transition-all"
                    >
                      Reset Password Now on This Device &rarr;
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Email form to send reset link */}
            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  htmlFor="email-input"
                >
                  Registered Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. gowthamreddysingam5@gmail.com"
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
                  <span>Send Password Reset Link &rarr;</span>
                )}
              </button>
            </form>

            {/* Return to Login */}
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

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
          Loading password recovery portal...
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
