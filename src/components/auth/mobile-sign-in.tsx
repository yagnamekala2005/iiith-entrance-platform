"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

interface MobileSignInProps {
  initialRole?: "student" | "admin";
}

export function MobileSignIn({ initialRole = "student" }: MobileSignInProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRole = searchParams.get("role") === "admin" ? "admin" : (searchParams.get("role") === "student" ? "student" : initialRole);
  const nextUrl = searchParams.get("next");
  const authError = searchParams.get("authError");
  const errorDetails = searchParams.get("errorDetails");

  const [role, setRole] = useState<"student" | "admin">(urlRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => {
    switch (authError) {
      case "oauth_cancelled":
        return "Google sign-in was cancelled. You can try again or use your password.";
      case "profile_update_failed":
        return "Google sign-in succeeded, but profile could not be updated.";
      case "role_lookup_failed":
        return "Unable to verify account access. Please try again.";
      case "not_admin":
        return "⚠️ This account is not an administrator. Please switch to Student login.";
      case "oauth_failed":
        return errorDetails
          ? `Google sign-in failed (${decodeURIComponent(errorDetails)}).`
          : "Google sign-in failed. Please try email and password.";
      default:
        return "";
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authError) {
      switch (authError) {
        case "oauth_cancelled":
          setMessage("Google sign-in was cancelled. You can try again or use email and password.");
          break;
        case "not_admin":
          setMessage("⚠️ This Google account is not registered as an administrator. Please switch to Student login.");
          break;
        case "oauth_failed":
          setMessage(errorDetails ? `Google sign-in failed (${decodeURIComponent(errorDetails)}).` : "Google sign-in failed.");
          break;
        default:
          break;
      }
    }
  }, [authError, errorDetails]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setLoading(false);
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("invalid login credentials") || errorMessage.includes("invalid credentials")) {
        setMessage("Incorrect email or password. Please verify and try again.");
      } else {
        setMessage(error.message);
      }
      return;
    }

    if (!data.user) {
      setLoading(false);
      setMessage("Login failed. Please try again.");
      return;
    }

    if (role === "admin") {
      const { data: adminMembership } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!adminMembership) {
        setLoading(false);
        setMessage("⚠️ This account is not registered as an administrator. Please switch to Student login.");
        return;
      }

      router.push(nextUrl || "/admin");
      router.refresh();
    } else {
      router.push(nextUrl || "/dashboard");
      router.refresh();
    }
  }

  const isAdmin = role === "admin";

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans pt-safe pb-safe selection:bg-[#2E3AE3] selection:text-white">
      {/* Decorative gentle top gradient curve */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-[#EEF2FF] via-[#F8FAFC] to-white pointer-events-none -z-10" />

      {/* Main Content Container - edge-to-edge on mobile, neatly centered on tablet */}
      <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        {/* App Emblem & Branding */}
        <div className="text-center">
          {/* Custom Education App Emblem */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E3AE3] to-[#1D2696] text-white shadow-lg shadow-[#2E3AE3]/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-white">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#1F2227]">
              IIITH PREP
            </span>
            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-black text-[#2E3AE3] uppercase tracking-wider border border-[#2E3AE3]/20">
              UGEE & SPEC
            </span>
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#1F2227] tracking-tight">
            {isAdmin ? "Admin Portal" : "Welcome Back 👋"}
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {isAdmin
              ? "Sign in with verified administrator credentials"
              : "Sign in to access your timed mock tests & scorecards"}
          </p>
        </div>

        {/* Form Body */}
        <div className="mt-6 space-y-4">
          {/* Error Message */}
          {message && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed flex items-start gap-2">
              <span className="text-sm shrink-0">⚠️</span>
              <span>{message}</span>
            </div>
          )}

          {/* Social Sign-In */}
          <GoogleOAuthButton disabled={loading} role={role} next={nextUrl} />

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold text-slate-400 lowercase tracking-wider">
              or with email
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Field */}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdmin ? "admin@iiith.ac.in" : "student@example.com"}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-11 pr-4 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-4 focus:ring-[#2E3AE3]/10 transition-all font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700" htmlFor="password">
                  Password
                </label>
                {!isAdmin && (
                  <Link
                    href="/forgot-password"
                    prefetch={true}
                    className="text-xs font-bold text-[#2E3AE3] hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-11 pr-11 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-4 focus:ring-[#2E3AE3]/10 transition-all font-medium placeholder:text-slate-400"
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

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl h-13 text-sm font-black text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2 ${
                isAdmin
                  ? "bg-[#1F2227] hover:bg-slate-800 shadow-slate-900/25"
                  : "bg-[#2E3AE3] hover:bg-[#252fb8] shadow-[#2E3AE3]/30"
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>{isAdmin ? "Sign In as Admin →" : "Sign In →"}</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 text-center space-y-3">
          {!isAdmin ? (
            <p className="text-xs text-slate-500 font-medium">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                prefetch={true}
                className="font-black text-[#2E3AE3] hover:underline"
              >
                Create Account
              </Link>
            </p>
          ) : (
            <p className="text-xs text-slate-500 font-medium">
              Need admin access? Contact your institution administrator.
            </p>
          )}

          {/* Discreet Admin / Student Toggle */}
          <div>
            <button
              type="button"
              onClick={() => {
                setRole(isAdmin ? "student" : "admin");
                setMessage("");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 transition-colors"
            >
              <span>{isAdmin ? "👨‍🎓 Switch to Student Portal" : "🛡️ Administrator Access"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Android Safe Area Bottom Spacer */}
      <div className="h-4 w-full" aria-hidden="true" />
    </div>
  );
}
