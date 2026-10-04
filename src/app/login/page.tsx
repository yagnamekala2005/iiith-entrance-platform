"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "student";
  const nextUrl = searchParams.get("next");

  const [role, setRole] = useState<"student" | "admin">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => searchParams.get("oauth_error") || "");
  const [loading, setLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        setCurrentUserEmail(user.email);
      }
    });
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const next = role === "admin" ? (nextUrl || "/admin") : (nextUrl || "/dashboard");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

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

      if (
        errorMessage.includes("invalid login credentials") ||
        errorMessage.includes("invalid credentials")
      ) {
        setMessage("Incorrect email or password. Please verify your credentials and try again.");
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

    // Role-based routing and verification with instant SPA redirect
    if (role === "admin") {
      const { data: adminMembership } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!adminMembership) {
        setLoading(false);
        setMessage(
          "⚠️ This account is not enrolled as an administrator. Please toggle to the Student Login tab to access your dashboard."
        );
        return;
      }

      router.push(nextUrl || "/admin");
      router.refresh();
    } else {
      router.push(nextUrl || "/dashboard");
      router.refresh();
    }
  }

  const isAdminTab = role === "admin";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden w-full max-w-full">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Back Link */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors active:scale-95"
            title="Return to previous page"
          >
            <span>&larr;</span>
            <span>Back to Previous Page</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl">
          {/* Header Area based on Role */}
          <div className={`p-6 sm:p-8 pb-0 ${isAdminTab ? "bg-slate-900 text-white pb-6" : ""}`}>
            <div className="flex items-center justify-between">
              <span
                className={`rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  isAdminTab
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {isAdminTab ? "🛡️ ADMINISTRATOR ACCESS" : "👨‍🎓 STUDENT ENTRANCE PORTAL"}
              </span>

              {/* Discreet Switcher Link - only visible from student portal */}
              {!isAdminTab && (
                <button
                  type="button"
                  onClick={() => {
                    setRole("admin");
                    setMessage("");
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-blue-700 transition-colors"
                >
                  Admin Portal &rarr;
                </button>
              )}
            </div>

            <h1 className={`mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight ${isAdminTab ? "text-white" : "text-slate-900"}`}>
              {isAdminTab ? "Admin Portal Sign In" : "Student Sign In"}
            </h1>

            <p className={`mt-1.5 text-xs leading-relaxed ${isAdminTab ? "text-slate-300" : "text-slate-500"}`}>
              {isAdminTab
                ? "Sign in with verified administrator credentials to author questions, verify answer keys, and manage mock tests."
                : "Sign in to access real-time timed mock tests across Maths, Physics, Chemistry, and Aptitude."}
            </p>
          </div>

          {/* Form Area */}
          <form className="p-6 sm:p-8 pt-4 space-y-5" onSubmit={handleSubmit}>

            {/* Active Session Notice when navigating back while signed in */}
            {currentUserEmail && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-xs shadow-2xs">
                <p className="font-semibold text-blue-900 leading-snug">
                  You are currently logged in as <strong className="font-bold underline">{currentUserEmail}</strong>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Link
                    href={isAdminTab ? "/admin" : "/dashboard"}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white hover:bg-blue-800 transition-all text-xs shadow-xs"
                  >
                    Go to {isAdminTab ? "Admin Studio" : "Student Dashboard"} &rarr;
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      setCurrentUserEmail(null);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-50 transition-all text-xs"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {message && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 animate-in fade-in leading-relaxed">
                {message}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="email">
                Email Address
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdminTab ? "admin@iiith.ac.in" : "student@example.com"}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="password">
                  Password
                </label>
                <Link
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="mt-1.5 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 text-xs font-bold uppercase tracking-wider text-slate-800 shadow-sm hover:bg-slate-50 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "Connecting to Google..." : "Continue with Google"}
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md active:scale-95 disabled:opacity-50 transition-all ${
                isAdminTab
                  ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
                  : "bg-blue-700 hover:bg-blue-800 shadow-blue-700/25"
              }`}
            >
              {loading
                ? "Authenticating..."
                : isAdminTab
                ? "Sign In to Admin Studio →"
                : "Sign In to Dashboard →"}
            </button>

            {/* Student registration link only - Admin creation removed */}
            {!isAdminTab && (
              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                New aspirant?{" "}
                <Link className="font-bold text-blue-700 hover:text-blue-900" href="/register">
                  Create a student account &rarr;
                </Link>
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs font-bold">
          Loading authentication gateway...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
