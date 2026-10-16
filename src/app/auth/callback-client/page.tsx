"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeInternalRedirect } from "@/lib/security/redirect";

function CallbackClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const role = searchParams.get("role") || "student";
  const next = searchParams.get("next");
  const [statusText, setStatusText] = useState("Completing Google Sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      if (!code) {
        router.push(`/login?role=${role}&authError=oauth_failed&errorDetails=No+code+received`);
        return;
      }

      try {
        const supabase = createClient();
        setStatusText("Verifying session with Google...");

        // Check if session is already active
        const { data: existingSession } = await supabase.auth.getSession();
        let user = existingSession?.session?.user;

        // Exchange code if no active session
        if (!user) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error || !data?.user) {
            // Check if session was established concurrently or detected from URL
            const retry = await supabase.auth.getSession();
            if (retry.data?.session?.user) {
              user = retry.data.session.user;
            } else {
              console.error("Client code exchange error:", error);
              const errDetail = error?.message || "Failed to exchange session";
              if (!cancelled) {
                router.push(
                  `/login?role=${role}&authError=oauth_failed&errorDetails=${encodeURIComponent(errDetail)}`
                );
              }
              return;
            }
          } else {
            user = data.user;
          }
        }

        if (cancelled) return;
        setStatusText("Sign-in successful! Redirecting to app...");

        // Ensure profile exists/updated
        try {
          const metadata = user.user_metadata ?? {};
          const fullName = [metadata.full_name, metadata.name].find(
            (v): v is string => typeof v === "string" && v.trim().length > 0
          )?.trim() || user.email?.split("@")[0] || "User";
          const avatarUrl = [metadata.avatar_url, metadata.picture].find(
            (v): v is string => typeof v === "string" && v.trim().length > 0
          )?.trim() || null;

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              display_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("Client profile upsert warning (non-fatal):", profileErr);
        }

        // If admin role requested, verify admin membership
        if (role === "admin") {
          const { data: adminRow } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!adminRow) {
            if (!cancelled) {
              router.push("/login?role=admin&authError=not_admin");
            }
            return;
          }
          const destination = safeInternalRedirect(next, "/admin", window.location.origin);
          window.location.replace(
            destination === "/admin" || destination.startsWith("/admin/")
              ? destination
              : "/admin",
          );
          return;
        }

        const destination = safeInternalRedirect(next, "/dashboard", window.location.origin);
        window.location.replace(
          destination === "/admin" || destination.startsWith("/admin/")
            ? "/dashboard"
            : destination,
        );
        return;
      } catch (err: unknown) {
        console.error("Client callback error:", err);
        const msg = err instanceof Error ? err.message : "Authentication error";
        if (!cancelled) {
          router.push(
            `/login?role=${role}&authError=oauth_failed&errorDetails=${encodeURIComponent(msg)}`
          );
        }
      }
    }

    void exchangeCode();

    return () => {
      cancelled = true;
    };
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
