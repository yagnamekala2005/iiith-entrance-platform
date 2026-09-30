"use client";

import Link from "next/link";
import { FormEvent, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "admin" ? "admin" : "student";
  const nextUrl = searchParams.get("next");

  const [role, setRole] = useState<"student" | "admin">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
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

    // Role-based routing and verification
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

      window.location.href = nextUrl || "/admin";
    } else {
      window.location.href = nextUrl || "/dashboard";
    }
  }

  const isAdminTab = role === "admin";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>&larr;</span>
            <span>Back to Entrance Portal</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-2xl">
          {/* Dual Role Selector Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setMessage("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                !isAdminTab
                  ? "bg-white text-blue-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>👨‍🎓</span>
              <span>Student Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setMessage("");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                isAdminTab
                  ? "bg-slate-900 text-teal-300 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <span>🛡️</span>
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Form Area */}
          <form className="p-6 sm:p-8 space-y-5" onSubmit={handleSubmit}>
            {/* Header info */}
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    isAdminTab
                      ? "bg-teal-50 text-teal-900 border border-teal-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  {isAdminTab ? "AUTHORIZATION REQUIRED" : "ENTRANCE ASPIRANT"}
                </span>
              </div>

              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isAdminTab ? "Admin Control Sign In" : "Student Sign In"}
              </h1>

              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {isAdminTab
                  ? "Sign in with verified administrator credentials to author questions and manage mock tests."
                  : "Sign in to access real-time mock tests, practice by subject, and view your scorecards."}
              </p>
            </div>

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
                  href="/forgot-password"
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

            {/* Register link */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              New aspirant?{" "}
              <Link className="font-bold text-blue-700 hover:text-blue-900" href="/register">
                Create a student account
              </Link>
            </div>
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
