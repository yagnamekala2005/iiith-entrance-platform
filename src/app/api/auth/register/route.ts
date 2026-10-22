import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import { registrationSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const ipLimit = await checkRateLimit("auth-register-ip", 10, 3600, undefined, request.headers);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return NextResponse.json({ error: "Invalid registration request." }, { status: body.status });
    const validation = validateInput<{ email: string; password: string }>(registrationSchema, body.value);
    if (validation.error || !validation.value) {
      return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
    }

    const emailLimit = await checkRateLimit(
      "auth-register-email",
      3,
      3600,
      validation.value.email,
      request.headers,
    );
    if (!emailLimit.allowed) {
      return NextResponse.json({ error: "Too many registration attempts. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: validation.value.email,
      password: validation.value.password,
      email_confirm: true,
    });

    if (error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("user already")
      ) {
        return NextResponse.json({
          success: true,
          message: "Account is ready. Sign in to continue.",
        }, { status: 201 });
      }

      console.error("Registration failed:", error.message);
      return NextResponse.json({ error: "Unable to create account. Please check the information or try again later." }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "The account could not be created. Please try again." },
        { status: 500 },
      );
    }

    // Public registrations are strictly student accounts.
    // Admin accounts must be granted by existing administrators or enrolled in Supabase.
    return NextResponse.json({
      success: true,
      message: "Account is ready. Sign in to continue.",
    }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Unable to create the account. Please try again later." },
      { status: 503 },
    );
  }
}
