import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  try {
    const supabase = await createClient();

    const redirectTo = new URL("/auth/callback", origin);
    redirectTo.searchParams.set("next", next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error || !data.url) {
      console.error("Unable to start Google OAuth:", error);
      return NextResponse.redirect(
        new URL("/login?authError=oauth_failed", origin),
      );
    }

    const response = NextResponse.redirect(data.url);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Google OAuth start failed:", error);
    return NextResponse.redirect(
      new URL("/login?authError=oauth_failed", origin),
    );
  }
}
