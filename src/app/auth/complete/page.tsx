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
      const code = params.get("code");
      const requestedNext = params.get("next") ?? "/dashboard";
      const destination = requestedNext.startsWith("/")
        ? requestedNext
        : "/dashboard";

      const supabase = createClient();

      if (!code) {
        // A previous successful exchange may already have established a
        // browser session. Reuse it rather than making the user sign in twice.
        const { data } = await supabase.auth.getUser();

        if (cancelled) return;

        if (data.user) {
          window.location.replace(destination);
          return;
        }

        window.location.replace("/login?authError=oauth_failed");
        return;
      }

      // Exchange the authorization code in the browser so the same browser
      // storage that contains the PKCE verifier also receives the session.
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) return;

      if (exchangeError) {
        console.error("Browser OAuth code exchange failed:", exchangeError);

        // A retry can safely reuse an already-established session if the
        // browser completed the exchange just before this response arrived.
        const { data } = await supabase.auth.getUser();

        if (!cancelled && data.user) {
          window.location.replace(destination);
          return;
        }

        window.location.replace("/login?authError=oauth_failed");
        return;
      }

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
