import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { paymentStatusQuerySchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ipLimit = await checkRateLimit("subscription-status-ip", 60, 600, undefined, request.headers);
    if (!ipLimit.allowed) return NextResponse.json({ error: "Too many status checks. Try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to check your subscription." }, { status: 401 });

    const userLimit = await checkRateLimit("subscription-status-user", 30, 600, user.id, request.headers);
    if (!userLimit.allowed) return NextResponse.json({ error: "Too many status checks. Try again later." }, { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } });

    const queryValidation = validateInput<{ orderId: string }>(
      paymentStatusQuerySchema,
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (queryValidation.error || !queryValidation.value) return NextResponse.json({ error: "A valid order ID is required." }, { status: 400 });
    const orderId = queryValidation.value.orderId;

    const admin = createAdminClient();
    const { data: subscription, error } = await admin
      .from("mock_test_subscriptions")
      .select("status,provider_payment_id,expires_at")
      .eq("user_id", user.id)
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Subscription status lookup failed:", error);
      return NextResponse.json({ error: "Could not check subscription status." }, { status: 500 });
    }
    if (!subscription) return NextResponse.json({ status: "not_found" }, { status: 404 });

    const active = subscription.status === "active" &&
      !!subscription.provider_payment_id &&
      !!subscription.expires_at &&
      new Date(subscription.expires_at).getTime() > Date.now();

    return NextResponse.json({
      status: active ? "active" : subscription.status,
      expiresAt: subscription.expires_at,
    });
  } catch (error) {
    console.error("Subscription status check error:", error);
    return NextResponse.json({ error: "Unexpected error checking subscription status." }, { status: 500 });
  }
}
