import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import {
  RECOVERY_AUTHORIZATION_COOKIE,
  verifyRecoveryAuthorization,
} from "@/lib/security/recovery-authorization";
import { passwordUpdateSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const ipLimit = await checkRateLimit("auth-password-update-ip", 5, 900, undefined, request.headers);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many password update attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "A verified recovery session is required." }, { status: 401 });

    const cookieStore = await cookies();
    if (!verifyRecoveryAuthorization(
      cookieStore.get(RECOVERY_AUTHORIZATION_COOKIE)?.value,
      user.id,
    )) {
      return NextResponse.json({ error: "A verified recovery session is required." }, { status: 403 });
    }

    const userLimit = await checkRateLimit("auth-password-update-user", 3, 900, user.id, request.headers);
    if (!userLimit.allowed) {
      return NextResponse.json({ error: "Too many password update attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(userLimit.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return NextResponse.json({ error: "Invalid password update request." }, { status: body.status });
    const validation = validateInput<{ password: string }>(passwordUpdateSchema, body.value);
    if (validation.error || !validation.value) {
      return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password: validation.value.password });
    if (error) {
      console.error("Recovered password could not be updated:", error.message);
      return NextResponse.json({ error: "Could not update password. Request a new recovery code." }, { status: 400 });
    }

    cookieStore.delete(RECOVERY_AUTHORIZATION_COOKIE);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Recovered password update failed:", error);
    return NextResponse.json({ error: "Password update is temporarily unavailable." }, { status: 503 });
  }
}
