"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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

      // The callback has already exchanged the PKCE code on the server.
      // Give the browser a few attempts to observe the session cookie before
      // navigating to a server-rendered protected page.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        if (cancelled) return;

        const { data, error } = await supabase.auth.getUser();

        if (data.user && !error) {
          window.location.replace(destination);
          return;
        }

        await sleep(200);
      }

      if (!cancelled) {
        window.location.replace("/login?authError=oauth_failed");
      }
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
