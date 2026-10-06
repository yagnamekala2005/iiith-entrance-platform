import { NextResponse } from "next/server";

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

  // Keep the PKCE exchange on the browser side. The Supabase browser client
  // owns the PKCE verifier, so exchanging the code in the same browser
  // guarantees the verifier and resulting auth session stay together.
  const completeUrl = new URL("/auth/complete", origin);
  completeUrl.searchParams.set("code", code);
  completeUrl.searchParams.set("next", next);

  const response = NextResponse.redirect(completeUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
