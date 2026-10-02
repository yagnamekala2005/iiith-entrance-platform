"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { directResetPasswordAction } from "@/lib/admin/actions";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // 1. If PKCE code present in query params, exchange for session
    if (codeParam) {
      supabase.auth.exchangeCodeForSession(codeParam).then(({ data, error }) => {
        if (!error && data.session) {
          setSessionReady(true);
          if (data.session.user?.email) {
            setEmail(data.session.user.email);
          }
        }
      });
    }

    // 2. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        if (session.user?.email && !email) {
          setEmail(session.user.email);
        }
      }
    });

    // 3. Listen for PASSWORD_RECOVERY or SIGNED_IN events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        setSessionReady(true);
        if (session?.user?.email && !email) {
          setEmail(session.user.email);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [codeParam, email]);

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");

    if (newPassword.length < 6) {
      setLoading(false);
      setStatus("error");
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setStatus("error");
      setMessage("Passwords do not match. Please re-enter.");
      return;
    }

    const supabase = createClient();

    // 1. Try standard Supabase session password update
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (!updateErr) {
      setLoading(false);
      setStatus("success");
      setMessage("🎉 Your new password has been successfully updated and saved in Supabase! Redirecting to sign in...");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/login");
      }, 1800);
      return;
    }

    // 2. If session update failed (e.g. cross-device link), fallback to direct admin update
    const targetEmail = email.trim().toLowerCase();
    if (targetEmail) {
      const directRes = await directResetPasswordAction(targetEmail, newPassword);
      setLoading(false);

      if (directRes.success) {
        setStatus("success");
        setMessage("🎉 Your new password has been successfully updated and saved in Supabase! Redirecting to sign in...");
        setNewPassword("");
        setConfirmPassword("");
        window.setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(targetEmail)}`);
        }, 1800);
        return;
      }

      setStatus("error");
      setMessage(directRes.error || updateErr.message);
      return;
    }

    setLoading(false);
    setStatus("error");
    setMessage(updateErr.message || "Failed to update password. Please enter your registered email address.");
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
              CREDENTIAL RECOVERY
            </span>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Reset Your Password
            </h1>

            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Enter and confirm your new password below. It will be verified and stored directly in Supabase.
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
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in leading-relaxed">
                {message}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Email field (only shown if not in active session) */}
              {!sessionReady && (
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    htmlFor="reset-email"
                  >
                    Registered Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. gowthamreddysingam5@gmail.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    htmlFor="new-password"
                  >
                    New Password (Min 6 characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-semibold text-slate-500 hover:text-blue-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-1.5 relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  htmlFor="confirm-password"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
                    <span>Updating in Supabase...</span>
                  </>
                ) : (
                  <span>Save Updated Password in Supabase &rarr;</span>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
          Loading password reset portal...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
