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
        return "⚠️ This account is not an administrator. Please select the Student tab.";
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
          setMessage("⚠️ This Google account is not registered as an administrator. Please select the Student tab.");
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
        setMessage("⚠️ This account is not registered as an administrator. Please select the Student tab.");
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans pt-safe pb-safe px-4 sm:px-6">
      {/* Top Branding Header */}
      <div className="w-full max-w-sm mx-auto pt-6 sm:pt-10 text-center">
        {/* App Icon Badge */}
        <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[#2E3AE3] text-white font-black text-xl sm:text-2xl shadow-lg shadow-[#2E3AE3]/30 tracking-tight">
          II
        </div>

        <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#1F2227]">
          IIITH PREP
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#2E3AE3] uppercase tracking-wider">
          CBT Entrance Examination
        </p>

        {/* Role Selector Tabs (Segmented Control) */}
        <div className="mt-6 flex rounded-2xl bg-slate-200/70 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setRole("student");
              setMessage("");
            }}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
              !isAdmin
                ? "bg-white text-[#2E3AE3] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👨‍🎓 Student
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("admin");
              setMessage("");
            }}
            className={`flex-1 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
              isAdmin
                ? "bg-[#1F2227] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🛡️ Admin
          </button>
        </div>
      </div>

      {/* Main Sign-In Card */}
      <div className="w-full max-w-sm mx-auto my-auto py-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl space-y-4">
          {/* Error Message */}
          {message && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
              {message}
            </div>
          )}

          {/* Social Sign-In */}
          <div>
            <GoogleOAuthButton disabled={loading} role={role} next={nextUrl} />
          </div>

          <div className="flex items-center gap-3 py-0.5">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              or email
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
                placeholder={isAdmin ? "admin@iiith.ac.in" : "student@example.com"}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-[#1F2227] outline-none focus:border-[#2E3AE3] focus:bg-white focus:ring-2 focus:ring-[#2E3AE3]/15 transition-all font-medium placeholder:text-slate-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600" htmlFor="password">
                  Password
                </label>
                {!isAdmin && (
                  <Link
                    href="/forgot-password"
                    prefetch={true}
                    className="text-[11px] font-bold text-[#2E3AE3] hover:underline"
                  >
                    Forgot?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
              className={`w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 mt-2 ${
                isAdmin
                  ? "bg-[#1F2227] hover:bg-slate-800 shadow-slate-900/20"
                  : "bg-[#2E3AE3] hover:bg-[#252fb8] shadow-[#2E3AE3]/25"
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>{isAdmin ? "Sign In as Admin" : "Sign In to Mock Tests"}</span>
              )}
            </button>
          </form>
        </div>

        {/* Create Account Link for Students */}
        {!isAdmin && (
          <p className="mt-4 text-center text-xs text-slate-500 font-medium">
            New aspirant?{" "}
            <Link
              href="/register"
              prefetch={true}
              className="font-bold text-[#2E3AE3] hover:underline"
            >
              Create Free Account &rarr;
            </Link>
          </p>
        )}
      </div>

      {/* Bottom Subtle Trust Tagline */}
      <div className="w-full max-w-sm mx-auto pb-4 text-center text-[11px] text-slate-400 font-medium">
        IIITH UGEE & SPEC Authentic CBT Simulation
      </div>
    </div>
  );
}

