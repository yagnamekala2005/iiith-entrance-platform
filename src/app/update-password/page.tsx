"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RecoveryStatus = "checking" | "invalid" | "ready";

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const recoveryCode = code;

  const [status, setStatus] = useState<RecoveryStatus>(() =>
    !recoveryCode || authError || authErrorCode ? "invalid" : "checking",
  );
  const [message, setMessage] = useState(() =>
    !recoveryCode || authError || authErrorCode
      ? authErrorCode === "otp_expired"
        ? "This password reset link has expired. Request a new link to continue."
        : "This password reset link is invalid. Request a new link to continue."
      : "",
  );
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recoveryCode === null || authError || authErrorCode) return;

    let active = true;
    let isPasswordRecovery = false;
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        isPasswordRecovery = true;
        if (!active) return;

        setEmail(session.user.email ?? "");
        setStatus("ready");
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error("Password recovery session lookup failed:", error);

        // Supabase emits PASSWORD_RECOVERY on the next task after restoring the URL session.
        window.setTimeout(() => {
          if (!active || isPasswordRecovery) return;

          if (!data.session) {
            setStatus("invalid");
            setMessage(
              "This password reset link is invalid or has expired. Request a new link to continue.",
            );
            return;
          }

          setStatus("invalid");
          setMessage(
            "This link did not start a password recovery session. Request a new reset link to continue.",
          );
        }, 0);
      })
      .catch((error: unknown) => {
        console.error("Password recovery session lookup failed:", error);
        if (!active) return;
        setStatus("invalid");
        setMessage(
          "We couldn't verify this password reset link. Request a new link to continue.",
        );
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authError, authErrorCode, recoveryCode]);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setMessage("Enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match. Please re-enter them.");
      return;
    }

    if (status !== "ready") {
      setStatus("invalid");
      setMessage("A valid password reset session is required. Request a new reset link.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error("Password update failed:", error);
        setMessage(
          error.message.toLowerCase().includes("password") ||
            error.message.toLowerCase().includes("weak")
            ? "This password does not meet the security requirements. Try a stronger password."
            : "We couldn't update your password. Please request a new reset link and try again.",
        );
        return;
      }

      setNewPassword("");
      setConfirmPassword("");

      let signOutFailed = false;
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error("Sign-out after password update failed:", signOutError);
          signOutFailed = true;
        }
      } catch (error) {
        console.error("Sign-out after password update failed:", error);
        signOutFailed = true;
      }

      router.replace(
        signOutFailed ? "/login?passwordReset=signout-warning" : "/login?passwordReset=success",
      );
      router.refresh();
    } catch (error) {
      console.error("Password update failed:", error);
      setMessage("We couldn't update your password. Please try again.");
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
              Update Password
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {status === "ready" && email
                ? `Choose a new password for ${email}.`
                : "Set a new password using your secure recovery link."}
            </p>
          </div>

          <div className="p-6 sm:p-8 pt-5 space-y-5">
            {status === "checking" && (
              <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-semibold text-blue-800">
                Verifying your password reset link...
              </div>
            )}

            {(status === "invalid" || (status === "ready" && message)) && message && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
                {message}
              </div>
            )}

            {status === "invalid" && (
              <div className="space-y-3">
                <Link
                  href="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 transition-all"
                >
                  Request a New Reset Link
                </Link>
                <Link
                  href="/login"
                  className="block text-center text-xs font-bold text-blue-700 hover:text-blue-900"
                >
                  Return to Sign In
                </Link>
              </div>
            )}

            {status === "ready" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                      htmlFor="new-password"
                    >
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-700"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                  />
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
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your new password"
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                  />
                </div>

                {message && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-700 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/25 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password &rarr;</span>
                  )}
                </button>
              </form>
            )}

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

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
          Loading password recovery...
        </div>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
