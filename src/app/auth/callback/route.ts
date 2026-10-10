import { NextResponse } from "next/server";
import { getSafeInternalRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const { searchParams } = callbackUrl;
  const code = searchParams.get("code");
  const providerError = searchParams.get("error");
  const requestedDestination = searchParams.get("next");
  const isRecoveryFlow =
    searchParams.get("flow") === "recovery" ||
    searchParams.get("type") === "recovery" ||
    searchParams.get("next") === "/update-password";
  const loginWithError = (error: string) =>
    NextResponse.redirect(new URL(`/login?authError=${error}`, callbackUrl.origin));
  const recoveryWithError = () =>
    NextResponse.redirect(
      new URL("/forgot-password?recoveryError=1", callbackUrl.origin),
    );

  if (providerError) {
    if (isRecoveryFlow) return recoveryWithError();

    return loginWithError(
      providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed",
    );
  }

  if (!code) {
    return isRecoveryFlow ? recoveryWithError() : loginWithError("oauth_failed");
  }

  try {
    const supabase = await createClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data.user) {
      if (exchangeError) {
        console.error(
          isRecoveryFlow
            ? "Password recovery code exchange failed:"
            : "OAuth code exchange failed:",
          exchangeError,
        );
      }
      return isRecoveryFlow ? recoveryWithError() : loginWithError("oauth_failed");
    }

    // Recovery links use the same PKCE callback as OAuth, but must not run
    // the Google profile/role provisioning flow or redirect to a dashboard.
    // The update-password page verifies the session before allowing a change.
    if (isRecoveryFlow) {
      return NextResponse.redirect(
        new URL("/update-password?recovery=1", callbackUrl.origin),
      );
    }

    const user = data.user;
    const metadata = user.user_metadata ?? {};
    const fullName = [metadata.full_name, metadata.name].find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )?.trim();
    const avatarUrl = [metadata.avatar_url, metadata.picture].find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )?.trim();

    const { data: profile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileLookupError || !profile) {
      if (profileLookupError) {
        console.error("OAuth profile lookup failed:", profileLookupError);
      } else {
        console.error("OAuth profile is missing for authenticated user:", user.id);
      }
      return loginWithError("profile_update_failed");
    }

    const profileUpdates: { display_name?: string; avatar_url?: string } = {};
    if (fullName) profileUpdates.display_name = fullName;
    if (avatarUrl) profileUpdates.avatar_url = avatarUrl;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);

      if (profileUpdateError) {
        console.error("OAuth profile update failed:", profileUpdateError);
        return loginWithError("profile_update_failed");
      }
    }

    const { data: adminMembership, error: roleLookupError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleLookupError) {
      console.error("OAuth role lookup failed:", roleLookupError);
      return loginWithError("role_lookup_failed");
    }

    const fallbackDestination = adminMembership ? "/admin" : "/dashboard";
    const destination = getSafeInternalRedirect(
      requestedDestination,
      fallbackDestination,
    );

    return NextResponse.redirect(new URL(destination, callbackUrl.origin));
  } catch (error) {
    console.error(
      isRecoveryFlow ? "Password recovery callback failed:" : "OAuth callback failed:",
      error,
    );
    return isRecoveryFlow ? recoveryWithError() : loginWithError("oauth_failed");
  }
}
