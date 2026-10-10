"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";
import { LoginMotionScene } from "@/components/landing/login-motion-scene";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "student";
  const nextUrl = searchParams.get("next");
  const authError = searchParams.get("authError");

  const [role, setRole] = useState<"student" | "admin">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(() => {
    switch (authError) {
      case "oauth_cancelled":
        return "Google sign-in was cancelled. You can try again or use email and password.";
      case "profile_update_failed":
        return "Google sign-in succeeded, but your profile could not be updated. Please try again or contact support.";
      case "role_lookup_failed":
        return "We could not verify your account access. Please try again or contact support.";
      case "oauth_failed":
        return "Google sign-in could not be completed. Please try again or use email and password.";
      default:
        return "";
    }
  });
  const [loading, setLoading] = useState(false);

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
    <main className="login-experience relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="login-ambient login-ambient-blue" aria-hidden="true" />
      <div className="login-ambient login-ambient-violet" aria-hidden="true" />
      <div className="login-grid-overlay" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.9fr)] lg:gap-12 lg:px-12 lg:py-10 xl:gap-16 xl:px-16">
        <section className="login-visual-panel flex min-w-0 flex-col justify-center">
          <div className="mb-5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-cyan-200/80 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,.95)]" />
            IIITH ENTRANCE PREPARATION
          </div>
          <h2 className="max-w-2xl text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl">
            Your next chapter
            <span className="login-gradient-text block">starts with one attempt.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300/80 sm:text-base">
            Prepare with focus. Practice with purpose. Turn every mock test into a clearer path forward.
          </p>
          <div className="login-scene-wrap mt-7 sm:mt-9">
            <LoginMotionScene />
          </div>
          <div className="mt-5 hidden items-center gap-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 sm:flex">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />Focused practice</span>
            <span className="h-3 w-px bg-white/15" />
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-300" />Progress that matters</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[480px] min-w-0">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-300/40 hover:bg-white/[0.08] hover:text-white active:scale-95"
              title="Return to previous page"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
            {!isAdminTab ? (
              <button
                type="button"
                onClick={() => {
                  setRole("admin");
                  setMessage("");
                }}
                className="text-xs font-bold text-cyan-200 transition hover:text-white"
              >
                Admin Portal <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRole("student");
                  setMessage("");
                }}
                className="text-xs font-bold text-cyan-200 transition hover:text-white"
              >
                Student Login <span aria-hidden="true">↗</span>
              </button>
            )}
          </div>

          <div className="login-card overflow-hidden rounded-[28px] border border-white/10">
            <div className="login-card-header px-6 pb-6 pt-7 sm:px-8 sm:pt-9">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-cyan-200/20 bg-cyan-200/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100">
                  {isAdminTab ? "Administrator access" : "Student entrance portal"}
                </span>
                <span className="ml-auto hidden h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm text-cyan-100 sm:flex" aria-hidden="true">✦</span>
              </div>
              <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {isAdminTab ? "Welcome back, Admin" : "Welcome back"}
              </h1>
              <p className="mt-2 text-xs leading-6 text-slate-300/75 sm:text-sm">
                {isAdminTab
                  ? "Sign in with verified administrator credentials to manage questions and mock tests."
                  : "Sign in to continue your preparation and access your mock tests."}
              </p>
            </div>

            <form className="space-y-5 px-6 pb-7 sm:px-8 sm:pb-9" onSubmit={handleSubmit}>
              {message && (
                <div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-400/10 p-3.5 text-xs font-semibold leading-relaxed text-rose-100">
                  {message}
                </div>
              )}

              <GoogleOAuthButton disabled={loading} />
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">or use email</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-300" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isAdminTab ? "admin@iiith.ac.in" : "student@example.com"}
                  className="login-field mt-2 w-full rounded-xl border px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-300" htmlFor="password">
                    Password
                  </label>
                  <Link
                    className="text-xs font-semibold text-cyan-200 transition hover:text-white"
                    href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="login-field w-full rounded-xl border px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="login-submit w-full rounded-xl px-4 py-4 text-xs font-extrabold uppercase tracking-[0.13em] text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Authenticating..."
                  : isAdminTab
                  ? "Sign in to Admin Studio  →"
                  : "Sign in to Dashboard  →"}
              </button>

              {!isAdminTab && (
                <div className="border-t border-white/10 pt-5 text-center text-xs text-slate-400">
                  New aspirant?{" "}
                  <Link className="font-bold text-cyan-200 transition hover:text-white" href="/register">
                    Create a student account <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </form>
          </div>
          <p className="mt-5 text-center text-[10px] font-medium tracking-wide text-slate-500">
            YOUR PREPARATION. YOUR PACE. YOUR NEXT MILESTONE.
          </p>
        </section>
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
