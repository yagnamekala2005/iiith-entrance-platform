import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in before subscribing." }, { status: 401 });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

    const admin = createAdminClient();
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
        amount: 9900, currency: "INR",
        receipt: "sub_" + user.id.replace(/-/g, "").slice(0, 20) + "_" + Date.now().toString().slice(-8),
        notes: { user_id: user.id, plan: "iiith_prep_all_mocks_2_months" },
      }),
      cache: "no-store",
    });
    const order = await orderResponse.json().catch(() => null) as { id?: string; error?: { description?: string } } | null;
    if (!orderResponse.ok || !order?.id) {
      console.error("Razorpay subscription order failed:", order?.error?.description || orderResponse.status);
      return NextResponse.json({ error: "Could not create payment order." }, { status: 502 });
    }

    const { error } = await admin.from("mock_test_subscriptions").insert({
      user_id: user.id, status: "pending", amount_paise: 9900, provider_order_id: order.id,
    });
    if (error) {
      console.error("Could not save subscription order:", error);
      return NextResponse.json({ error: "Could not save the payment order." }, { status: 500 });
    }

    return NextResponse.json({ keyId, orderId: order.id, amount: 9900, currency: "INR", studentEmail: user.email });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return NextResponse.json({ error: "Unexpected error starting subscription." }, { status: 500 });
  }
}
