import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/body";
import { hasValidOrigin } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { loginSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const ipLimit = await checkRateLimit("auth-login-ip", 20, 900, undefined, request.headers);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request);
    if (!body.ok) return NextResponse.json({ error: "Invalid sign-in request." }, { status: body.status });
    const validation = validateInput<{ email: string; password: string }>(loginSchema, body.value);
    if (validation.error || !validation.value) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const emailLimit = await checkRateLimit(
      "auth-login-email",
      8,
      900,
      validation.value.email,
      request.headers,
    );
    if (!emailLimit.allowed) {
      return NextResponse.json({ error: "Too many sign-in attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
      });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(validation.value);
    if (error) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Password sign-in failed:", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
