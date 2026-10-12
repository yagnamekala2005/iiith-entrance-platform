"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const role = searchParams.get("role") || "student";
  const next = searchParams.get("next");
  const [statusText, setStatusText] = useState("Completing Google Sign-in...");

  useEffect(() => {
    async function exchangeCode() {
      if (!code) {
        router.push(`/login?role=${role}&authError=oauth_failed&errorDetails=No+code+received`);
        return;
      }

      try {
        const supabase = createClient();
        setStatusText("Verifying session with Google...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.user) {
          console.error("Client code exchange error:", error);
          const errDetail = error?.message || "Failed to exchange session";
          router.push(`/login?role=${role}&authError=oauth_failed&errorDetails=${encodeURIComponent(errDetail)}`);
          return;
        }

        setStatusText("Sign-in successful! Redirecting to app...");

        // If admin role requested, verify admin membership
        if (role === "admin") {
          const { data: adminRow } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (!adminRow) {
            router.push("/login?role=admin&authError=not_admin");
            return;
          }
          router.push(next || "/admin");
          router.refresh();
          return;
        }

        router.push(next || "/dashboard");
        router.refresh();
      } catch (err: unknown) {
        console.error("Client callback error:", err);
        const msg = err instanceof Error ? err.message : "Authentication error";
        router.push(`/login?role=${role}&authError=oauth_failed&errorDetails=${encodeURIComponent(msg)}`);
      }
    }

    void exchangeCode();
  }, [code, role, next, router]);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl flex flex-col items-center">
        <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-2">Signing In</h2>
        <p className="text-xs text-slate-400">{statusText}</p>
      </div>
    </main>
  );
}

export default function CallbackClientPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </main>
      }
    >
      <CallbackClientContent />
    </Suspense>
  );
}

