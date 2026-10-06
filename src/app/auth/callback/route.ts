import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  const loginWithError = (error: string) =>
    NextResponse.redirect(
      new URL(`/login?authError=${encodeURIComponent(error)}`, origin),
    );

  if (providerError) {
    return loginWithError(
      providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed",
    );
  }

  if (!code) {
    return loginWithError("oauth_failed");
  }

  try {
    const supabase = await createClient();

    // Complete the PKCE exchange and persist the Supabase session in SSR cookies.
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      console.error("OAuth code exchange failed:", exchangeError);
      return loginWithError("oauth_failed");
    }

    const user = data.user;

    const { data: adminMembership, error: roleLookupError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleLookupError) {
      console.error("OAuth role lookup failed:", roleLookupError);
      return loginWithError("role_lookup_failed");
    }

    if (next.startsWith("/admin") && !adminMembership) {
      return loginWithError("admin_access_denied");
    }

    const destination = next.startsWith("/admin") ? "/admin" : "/dashboard";
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv || !forwardedHost) {
      return NextResponse.redirect(new URL(destination, origin));
    }

    return NextResponse.redirect(`https://${forwardedHost}${destination}`);
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return loginWithError("oauth_failed");
  }
}
