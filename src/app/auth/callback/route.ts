import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  const redirectWithError = (error: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?authError=${encodeURIComponent(error)}`, origin),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (providerError) {
    return redirectWithError(
      providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed",
    );
  }

  if (!code) {
    return redirectWithError("oauth_failed");
  }

  try {
    const supabase = await createClient();

    // This is the only server-side operation required to complete the
    // Google PKCE flow. It writes the Supabase session to SSR cookies.
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error("OAuth code exchange failed:", exchangeError);
      return redirectWithError("oauth_failed");
    }

    // Do not query application tables here. The callback's responsibility is
    // to establish the auth session. Protected pages perform their own
    // authorization checks after the session exists.
    const completeUrl = new URL("/auth/complete", origin);
    completeUrl.searchParams.set("next", next);

    const response = NextResponse.redirect(completeUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return redirectWithError("oauth_failed");
  }
}
