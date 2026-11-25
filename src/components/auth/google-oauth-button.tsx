"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";

interface GoogleOAuthButtonProps {
  disabled?: boolean;
  role?: "student" | "admin";
  next?: string | null;
}

let nativeGoogleInitialization: Promise<void> | null = null;

export function GoogleOAuthButton({
  disabled = false,
  role = "student",
  next = null,
}: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleGoogleSignIn() {
    if (loading || disabled) return;

    setLoading(true);
    setErrorMessage("");

    const hasSupabaseConfig = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );

    if (!hasSupabaseConfig) {
      setErrorMessage(
        "Google sign-in is not configured. Please use email and password or contact support."
      );
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const destination =
      role === "admin"
        ? next?.startsWith("/admin")
          ? next
          : "/admin"
        : next?.startsWith("/") && !next.startsWith("/admin")
          ? next
          : "/dashboard";

    try {
      const isNative = Capacitor.isNativePlatform();
      const webClientId =
        process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        "746005594724-ei11p39tvt6nslofsnjupqcsaaa494es.apps.googleusercontent.com";

      // 1. Try Native Google Sign-In if available on Capacitor Android
      if (isNative && webClientId) {
        try {
          const { SocialLogin } = await import("@capgo/capacitor-social-login");

          if (!nativeGoogleInitialization) {
            nativeGoogleInitialization = SocialLogin.initialize({
              google: {
                webClientId,
                mode: "online",
              },
            })
              .then(() => undefined)
              .catch((err: unknown) => {
                nativeGoogleInitialization = null;
                throw err;
              });
          }

          await nativeGoogleInitialization;

          const response = await SocialLogin.login({
            provider: "google",
            options: {
              scopes: ["email", "profile"],
              filterByAuthorizedAccounts: false,
            },
          });

          if (
            response.provider === "google" &&
            response.result.responseType === "online" &&
            response.result.idToken
          ) {
            const googleResult = response.result;
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: googleResult.idToken as string,
            });

            if (error) throw error;
            if (!data.user) throw new Error("Google sign-in did not return a user.");

            if (data.session) {
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              });
            }

            const user = data.user;
            const metadata = user.user_metadata ?? {};
            const fullName =
              [metadata.full_name, metadata.name].find(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0
              )?.trim() ||
              user.email?.split("@")[0] ||
              "User";
            const avatarUrl =
              [metadata.avatar_url, metadata.picture].find(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0
              )?.trim() || null;

            try {
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
              console.warn("Google sign-in profile update warning:", profileErr);
            }

            if (role === "admin") {
              const { data: adminMembership, error: adminError } = await supabase
                .from("admin_users")
                .select("user_id")
                .eq("user_id", user.id)
                .maybeSingle();

              if (adminError) {
                throw new Error("We could not verify administrator access. Please try again.");
              }

              if (!adminMembership) {
                await supabase.auth.signOut();
                window.location.href = "/login?role=admin&authError=not_admin";
                return;
              }
            }

            // Full hard page navigation ensures cookies are committed to the network layer
            window.location.href = destination;
            return;
          }
          throw new Error("Google sign-in did not return an ID token. Please try again.");
        } catch (nativeErr: unknown) {
          const rawMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);
          const lowerMsg = rawMsg.toLowerCase();
          if (lowerMsg.includes("cancel") || lowerMsg.includes("dismissed")) {
            setErrorMessage("Google sign-in was cancelled.");
          } else {
            console.error("Native Google sign-in error:", nativeErr);
            setErrorMessage(rawMsg || "Unable to complete Google sign-in on this device.");
          }
          setLoading(false);
          return;
        }
      }

      // 2. Standard OAuth Flow (also serves as fallback if native client ID isn't configured)
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      if (role) callbackUrl.searchParams.set("role", role);
      if (next) callbackUrl.searchParams.set("next", next);

      const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) throw oauthError;

      if (oauthData?.url) {
        window.location.href = oauthData.url;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to start Google sign-in.";
      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("cancel") ||
        normalizedMessage.includes("dismissed")
      ) {
        setErrorMessage("Google sign-in was cancelled.");
      } else {
        console.error("Google sign-in error:", error);
        setErrorMessage(
          message || "Unable to complete Google sign-in. Please try again or use email and password."
        );
      }
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={disabled || loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white h-13 px-4 text-sm font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
          <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.83 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
      </button>
      {errorMessage && (
        <p role="alert" className="text-center text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
