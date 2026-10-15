import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in before subscribing." }, { status: 401 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

    const body = await request.json().catch(() => null) as { planId?: string } | null;
    const planId = body?.planId?.trim();
    if (!planId) return NextResponse.json({ error: "Choose a subscription plan." }, { status: 400 });

    const admin = createAdminClient();
    const { data: plan, error: planError } = await admin.from("mock_test_subscription_plans")
      .select("id,name,price_paise,duration_months,is_active")
      .eq("id", planId).eq("is_active", true).maybeSingle();
    if (planError || !plan) return NextResponse.json({ error: "This subscription plan is no longer available." }, { status: 404 });

    const { data: active } = await admin.from("mock_test_subscriptions")
      .select("id, expires_at").eq("user_id", user.id).eq("status", "active")
      .gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1).maybeSingle();
    if (active) return NextResponse.json({ alreadySubscribed: true, expiresAt: active.expires_at });

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price_paise, currency: "INR",
        receipt: "sub_" + user.id.replace(/-/g, "").slice(0, 20) + "_" + Date.now().toString().slice(-8),
        notes: { user_id: user.id, plan_id: plan.id, plan_name: plan.name, duration_months: String(plan.duration_months) },
      }),
      cache: "no-store",
    });
    const order = await orderResponse.json().catch(() => null) as { id?: string; error?: { description?: string } } | null;
    if (!orderResponse.ok || !order?.id) {
      console.error("Razorpay subscription order failed:", order?.error?.description || orderResponse.status);
      return NextResponse.json({ error: "Could not create payment order." }, { status: 502 });
    }

    const { error } = await admin.from("mock_test_subscriptions").insert({
      user_id: user.id, plan_id: plan.id, duration_months: plan.duration_months, status: "pending", amount_paise: plan.price_paise, provider_order_id: order.id,
    });
    if (error) {
      console.error("Could not save subscription order:", error);
      return NextResponse.json({ error: "Could not save the payment order." }, { status: 500 });
    }

    return NextResponse.json({ keyId, orderId: order.id, amount: plan.price_paise, currency: "INR", studentEmail: user.email, planName: plan.name, durationMonths: plan.duration_months });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return NextResponse.json({ error: "Unexpected error starting subscription." }, { status: 500 });
  }
}
