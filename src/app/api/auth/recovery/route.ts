import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import {
  createRecoveryAuthorization,
  RECOVERY_AUTHORIZATION_COOKIE,
  recoveryCookieOptions,
} from "@/lib/security/recovery-authorization";
import { recoveryRequestSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecoveryRequest = {
  action: "send" | "verify" | "exchange";
  email?: string;
  token?: string;
  code?: string;
};

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const ipLimit = await checkRateLimit("auth-recovery-ip", 10, 900, undefined, request.headers);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many recovery attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return NextResponse.json({ error: "Invalid recovery request." }, { status: body.status });
    const validation = validateInput<RecoveryRequest>(recoveryRequestSchema, body.value);
    if (validation.error || !validation.value) {
      return NextResponse.json({ error: "Invalid recovery request." }, { status: 400 });
    }

    const recovery = validation.value;
    if (recovery.email) {
      const emailLimit = await checkRateLimit(
        `auth-recovery-${recovery.action}-email`,
        recovery.action === "send" ? 3 : 8,
        900,
        recovery.email,
        request.headers,
      );
      if (!emailLimit.allowed) {
        return NextResponse.json({ error: "Too many recovery attempts. Try again later." }, {
          status: 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
        });
      }
    }

    const supabase = await createClient();
    if (recovery.action === "send") {
      const redirectTo = new URL("/auth/callback?type=recovery", request.url).toString();
      const { error } = await supabase.auth.resetPasswordForEmail(recovery.email!, { redirectTo });
      if (error) console.warn("Password recovery request could not be completed:", error.message);

      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, recovery instructions have been sent.",
      }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    if (recovery.action === "verify") {
      const { error } = await supabase.auth.verifyOtp({
        email: recovery.email!,
        token: recovery.token!,
        type: "recovery",
      });
      if (error) return NextResponse.json({ error: "The recovery code is invalid or expired." }, { status: 400 });
    } else {
      const { error } = await supabase.auth.exchangeCodeForSession(recovery.code!);
      if (error) return NextResponse.json({ error: "The recovery link is invalid or expired." }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Recovery authorization could not be verified." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      RECOVERY_AUTHORIZATION_COOKIE,
      createRecoveryAuthorization(user.id),
      recoveryCookieOptions,
    );
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Password recovery failed:", error);
    return NextResponse.json({ error: "Recovery is temporarily unavailable." }, { status: 503 });
  }
}
