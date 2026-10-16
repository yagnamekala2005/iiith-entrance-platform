"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const processedCode = useRef<string | null>(null);

  useEffect(() => {
    if (!codeParam || processedCode.current === codeParam) return;
    processedCode.current = codeParam;
    fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exchange", code: codeParam }),
      }).then(async (response) => {
        if (response.ok) return;
        setStatus("error");
        setMessage("This recovery link could not be verified. Request a new recovery code.");
      }).catch(() => {
        setStatus("error");
        setMessage("Recovery is temporarily unavailable. Please try again.");
      });
  }, [codeParam]);

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatus("idle");

    if (newPassword.length < 8) {
      setLoading(false);
      setStatus("error");
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setStatus("error");
      setMessage("Passwords do not match. Please re-enter.");
      return;
    }

    let response: Response;
    try {
      response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
    } catch {
      setLoading(false);
      setStatus("error");
      setMessage("Password update is temporarily unavailable. Please try again.");
      return;
    }

    const result: { error?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoading(false);
      setStatus("error");
      setMessage(result.error || "Could not update password. Request a new recovery code.");
      return;
    }

    if (response.ok) {
      setLoading(false);
      setStatus("success");
      setMessage("Your password has been updated. Redirecting to sign in...");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => router.push("/login"), 1800);
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
              <div>
                <div className="flex items-center justify-between">
                  <label
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    htmlFor="new-password"
                  >
                    New Password (Min 8 characters)
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
                    minLength={8}
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
                  minLength={8}
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
