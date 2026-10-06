"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCompletePage() {
  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get("next") ?? "/dashboard";
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

      // Full navigation ensures the newly established auth session is
      // available before the protected destination is rendered.
      window.location.replace(destination);
    }

    void completeSignIn();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="text-sm font-semibold">Completing Google sign-in...</p>
      </div>
    </main>
  );
}
