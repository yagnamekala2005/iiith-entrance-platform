"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get("code");
    const providerError = searchParams.get("error");
    const requestedNext = searchParams.get("next") ?? "/dashboard";
    const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

    if (providerError || !code) {
      router.replace(
        `/login?authError=${encodeURIComponent(
          providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed",
        )}`,
      );
      return;
    }

    const supabase = createClient();

    async function completeOAuth() {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.session || !data.user) {
        console.error("OAuth code exchange failed:", error);
        router.replace("/login?authError=oauth_failed");
        return;
      }

      // Confirm the browser client can immediately read the newly-created session
      // before navigating to a server-protected page.
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        console.error("OAuth session was not persisted in the browser.");
        router.replace("/login?authError=oauth_failed");
        return;
      }

      window.location.replace(next);
    }

    void completeOAuth();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        <p className="mt-4 text-sm font-semibold">Completing Google sign-in...</p>
      </div>
    </main>
  );
}
