import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to verify this payment." }, { status: 401 });

    const body = await request.json().catch(() => null) as {
      razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string;
    } | null;
    const orderId = body?.razorpay_order_id?.trim();
    const paymentId = body?.razorpay_payment_id?.trim();
    const signature = body?.razorpay_signature?.trim();
    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

    const admin = createAdminClient();
    const { data: subscription, error } = await admin.from("mock_test_subscriptions")
      .select("id,user_id,status,amount_paise,provider_order_id,provider_payment_id")
      .eq("user_id", user.id).eq("provider_order_id", orderId).maybeSingle();
    if (error || !subscription) return NextResponse.json({ error: "Subscription order not found." }, { status: 404 });
    if (subscription.status === "active" && subscription.provider_payment_id === paymentId) {
      return NextResponse.json({ verified: true, alreadyVerified: true });
    }
    if (subscription.status !== "pending") return NextResponse.json({ error: "This order is no longer pending." }, { status: 409 });

    const expected = createHmac("sha256", keySecret).update(orderId + "|" + paymentId).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64") },
      cache: "no-store",
    });
    const payment = await paymentResponse.json().catch(() => null) as {
      id?: string; order_id?: string; amount?: number; currency?: string; status?: string;
    } | null;
    if (!paymentResponse.ok || !payment) return NextResponse.json({ error: "Could not confirm payment with Razorpay." }, { status: 502 });
    if (payment.id !== paymentId || payment.order_id !== orderId || payment.amount !== 9900 ||
      payment.currency !== "INR" || payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not captured for ₹99. Access has not been activated." }, { status: 402 });
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setUTCMonth(expires.getUTCMonth() + 2);
    const { data: updated, error: updateError } = await admin.from("mock_test_subscriptions")
      .update({
        status: "active", provider_payment_id: paymentId,
        starts_at: now.toISOString(), expires_at: expires.toISOString(), updated_at: now.toISOString(),
      })
      .eq("id", subscription.id).eq("status", "pending").select("id,expires_at").maybeSingle();
    if (updateError || !updated) {
      console.error("Could not activate subscription:", updateError);
      return NextResponse.json({ error: "Payment verified but subscription activation failed. Contact support with payment ID." }, { status: 500 });
    }

    return NextResponse.json({ verified: true, expiresAt: updated.expires_at });
  } catch (error) {
    console.error("Verify subscription payment error:", error);
    return NextResponse.json({ error: "Unexpected error verifying subscription." }, { status: 500 });
  }
}
