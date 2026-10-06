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

    // The PKCE verifier was written by the server-side OAuth starter route.
    // Exchange the returned code on the same server-side client/cookie flow.
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error("OAuth code exchange failed:", exchangeError);
      return redirectWithError("oauth_failed");
    }

    if (next.startsWith("/admin")) {
      const { data: adminMembership, error: roleLookupError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleLookupError) {
        console.error("OAuth role lookup failed:", roleLookupError);
        return redirectWithError("role_lookup_failed");
      }

      if (!adminMembership) {
        return redirectWithError("admin_access_denied");
      }
    }

    const response = NextResponse.redirect(new URL(next, origin));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return redirectWithError("oauth_failed");
  }
}
