"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCompletePage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const requestedNext = searchParams.get("next") ?? "/dashboard";
      const destination = requestedNext.startsWith("/")
        ? requestedNext
        : "/dashboard";

      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !data.user) {
        window.location.replace("/login?authError=oauth_failed");
        return;
      }

      // Full navigation ensures the newly established auth cookies/session
      // are available before the protected destination is rendered.
      window.location.replace(destination);
    }

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="text-sm font-semibold">Completing Google sign-in...</p>
      </div>
    </main>
  );
}
