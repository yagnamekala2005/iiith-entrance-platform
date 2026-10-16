import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import { subscriptionPaymentVerificationSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const ipLimit = await checkRateLimit("subscription-verify-ip", 30, 600, undefined, request.headers);
    if (!ipLimit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to verify this payment." }, { status: 401 });

    const userLimit = await checkRateLimit("subscription-verify-user", 10, 600, user.id, request.headers);
    if (!userLimit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } });

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return NextResponse.json({ error: "Invalid payment verification request." }, { status: body.status });
    const validation = validateInput<{
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>(subscriptionPaymentVerificationSchema, body.value);
    if (validation.error || !validation.value) {
      return NextResponse.json({ error: "Payment verification details are incomplete." }, { status: 400 });
    }
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = validation.value;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });

    const admin = createAdminClient();
    const { data: subscription, error } = await admin.from("mock_test_subscriptions")
      .select("id,user_id,plan_id,duration_months,status,amount_paise,provider_order_id,provider_payment_id")
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
    if (payment.id !== paymentId || payment.order_id !== orderId || payment.amount !== subscription.amount_paise ||
      payment.currency !== "INR" || payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not captured for the selected plan amount. Access has not been activated." }, { status: 402 });
    }

    const durationMonths = Number(subscription.duration_months);
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24) {
      return NextResponse.json({ error: "The selected subscription duration is invalid. Contact support with your payment ID." }, { status: 500 });
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setUTCMonth(expires.getUTCMonth() + durationMonths);
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
