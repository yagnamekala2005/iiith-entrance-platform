import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createRecoveryAuthorization,
  RECOVERY_AUTHORIZATION_COOKIE,
  recoveryCookieOptions,
} from "@/lib/security/recovery-authorization";
import { safeInternalRedirect } from "@/lib/security/redirect";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const requestedRole = searchParams.get("role") || "student";
  const nextParam = searchParams.get("next");
  const isRecoveryFlow = searchParams.get("type") === "recovery";

  const origin = requestUrl.origin;

  const loginWithError = (errorType: string, details?: string | null) => {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("authError", errorType);
    if (requestedRole) loginUrl.searchParams.set("role", requestedRole);
    if (details) loginUrl.searchParams.set("errorDetails", details);
    return NextResponse.redirect(loginUrl);
  };

  if (providerError) {
    if (providerError === "access_denied") {
      return loginWithError("oauth_cancelled");
    }
    return loginWithError("oauth_failed", errorDescription || providerError);
  }

  if (!code) {
    return loginWithError("oauth_failed", "No authorization code was provided by authentication service.");
  }

  try {
    const cookieStore = await cookies();
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey) {
      return loginWithError("oauth_failed", "Supabase credentials are not configured.");
    }

    // Default destination
    const fallbackPath = requestedRole === "admin" ? "/admin" : "/dashboard";
    const safeNext = safeInternalRedirect(nextParam, fallbackPath, origin);
    const destinationPath = requestedRole === "admin"
      ? safeNext.startsWith("/admin/") || safeNext === "/admin" ? safeNext : "/admin"
      : safeNext.startsWith("/admin/") || safeNext === "/admin" ? "/dashboard" : safeNext;

    const redirectUrl = new URL(destinationPath, origin);
    const response = NextResponse.redirect(redirectUrl);

    // Create server client connected to both cookieStore and response.cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, {
                  ...options,
                  sameSite: options?.sameSite || "lax",
                  path: options?.path || "/",
                  secure: process.env.NODE_ENV === "production",
                });
              } catch {
                // Ignore in read-only phases
              }
              response.cookies.set(name, value, {
                ...options,
                sameSite: options?.sameSite || "lax",
                path: options?.path || "/",
                secure: process.env.NODE_ENV === "production",
              });
            });
          },
        },
      }
    );

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      const errMsg = exchangeError?.message || "Exchange failed";
      console.warn("OAuth server code exchange failed:", errMsg);

      if (isRecoveryFlow) {
        const recoveryFallback = new URL("/forgot-password", origin);
        recoveryFallback.searchParams.set("recoveryError", "1");
        return NextResponse.redirect(recoveryFallback);
      }

      // On mobile and desktop browsers, cross-site redirects often omit the PKCE code verifier cookie in server request headers.
      // Seamlessly delegate to client-side callback page to exchange session using browser cookies.
      const clientCallbackUrl = new URL("/auth/callback-client", origin);
      clientCallbackUrl.searchParams.set("code", code);
      if (requestedRole) clientCallbackUrl.searchParams.set("role", requestedRole);
      if (nextParam) clientCallbackUrl.searchParams.set("next", nextParam);
      return NextResponse.redirect(clientCallbackUrl);
    }

    const user = data.user;

    if (isRecoveryFlow) {
      response.headers.set("Location", new URL("/reset-password", origin).toString());
      response.cookies.set(
        RECOVERY_AUTHORIZATION_COOKIE,
        createRecoveryAuthorization(user.id),
        recoveryCookieOptions,
      );
      return response;
    }

    // Non-fatal Profile Upsert
    try {
      let adminClient;
      try {
        adminClient = createAdminClient();
      } catch {
        adminClient = null;
      }

      const clientToUse = adminClient || supabase;
      const metadata = user.user_metadata ?? {};
      const fullName = [metadata.full_name, metadata.name].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0
      )?.trim() || user.email?.split("@")[0] || "User";
      const avatarUrl = [metadata.avatar_url, metadata.picture].find(
        (v): v is string => typeof v === "string" && v.trim().length > 0
      )?.trim() || null;

      await clientToUse.from("profiles").upsert(
        {
          id: user.id,
          display_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (profileErr) {
      console.warn("OAuth profile upsert warning (non-fatal):", profileErr);
    }

    // Role Verification
    let isAdmin = false;
    try {
      let adminClient;
      try {
        adminClient = createAdminClient();
      } catch {
        adminClient = null;
      }

      const clientToUse = adminClient || supabase;
      const { data: adminMembership } = await clientToUse
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      isAdmin = Boolean(adminMembership);
    } catch (roleErr) {
      console.warn("OAuth admin check warning:", roleErr);
    }

    if (requestedRole === "admin") {
      if (!isAdmin) {
        return loginWithError(
          "not_admin",
          "This Google account is not enrolled as an administrator."
        );
      }
      const adminNext = safeInternalRedirect(nextParam, "/admin", origin);
      redirectUrl.pathname = adminNext === "/admin" || adminNext.startsWith("/admin/")
        ? new URL(adminNext, origin).pathname
        : "/admin";
      if (redirectUrl.pathname === new URL(adminNext, origin).pathname) {
        redirectUrl.search = new URL(adminNext, origin).search;
      }
    } else {
      const studentNext = safeInternalRedirect(nextParam, "/dashboard", origin);
      const parsedStudentNext = new URL(studentNext, origin);
      redirectUrl.pathname = parsedStudentNext.pathname === "/admin" || parsedStudentNext.pathname.startsWith("/admin/")
        ? "/dashboard"
        : parsedStudentNext.pathname;
      redirectUrl.search = redirectUrl.pathname === parsedStudentNext.pathname ? parsedStudentNext.search : "";
    }

    // Ensure final location header is updated
    response.headers.set("Location", redirectUrl.toString());

    // Set cache control headers to prevent proxy caching
    response.headers.set("x-middleware-cache", "no-cache");
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unexpected OAuth callback error";
    console.error("OAuth callback exception:", error);
    return loginWithError("oauth_failed", errorMsg);
  }
}
