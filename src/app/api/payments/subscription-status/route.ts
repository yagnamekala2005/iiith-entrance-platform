import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to check your subscription." }, { status: 401 });

    const orderId = new URL(request.url).searchParams.get("orderId")?.trim();
    if (!orderId) return NextResponse.json({ error: "Order ID is required." }, { status: 400 });

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
