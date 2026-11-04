import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: {
      id?: string;
      order_id?: string;
      amount?: number;
      currency?: string;
      status?: string;
    } };
    order?: { entity?: {
      id?: string;
      amount?: number;
      currency?: string;
      status?: string;
    } };
  };
};

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Razorpay webhook is not configured: RAZORPAY_WEBHOOK_SECRET is missing.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const orderId = payment?.order_id || order?.id;
  const paymentId = payment?.id;
  const amount = payment?.amount ?? order?.amount;
  const currency = payment?.currency ?? order?.currency;

  if (!orderId || !paymentId || typeof amount !== "number" || currency !== "INR") {
    return NextResponse.json({ error: "Captured payment details are incomplete." }, { status: 400 });
  }
  if (event.event === "payment.captured" && payment?.status !== "captured") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: subscription, error: lookupError } = await admin
    .from("mock_test_subscriptions")
    .select("id,status,amount_paise,duration_months,provider_payment_id")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  if (lookupError) {
    console.error("Razorpay webhook subscription lookup failed:", lookupError);
    return NextResponse.json({ error: "Could not find subscription order." }, { status: 500 });
  }
  if (!subscription) {
    // A valid Razorpay payment can belong to a different product or an order
    // that was never saved locally. Acknowledge it without activating anything.
    console.warn("Captured Razorpay order has no matching subscription:", orderId);
    return NextResponse.json({ received: true, matched: false });
  }

  if (amount !== subscription.amount_paise) {
    console.error("Razorpay webhook amount mismatch for subscription:", subscription.id);
    return NextResponse.json({ error: "Payment amount does not match subscription order." }, { status: 400 });
  }
  if (subscription.status === "active" && subscription.provider_payment_id === paymentId) {
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }
  if (subscription.status !== "pending") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const durationMonths = Number(subscription.duration_months);
  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24) {
    console.error("Invalid subscription duration in webhook:", subscription.id);
    return NextResponse.json({ error: "Invalid subscription duration." }, { status: 500 });
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setUTCMonth(expires.getUTCMonth() + durationMonths);
  const { data: updated, error: updateError } = await admin
    .from("mock_test_subscriptions")
    .update({
      status: "active",
      provider_payment_id: paymentId,
      starts_at: now.toISOString(),
      expires_at: expires.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", subscription.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("Razorpay webhook could not activate subscription:", updateError);
    return NextResponse.json({ error: "Could not activate subscription." }, { status: 500 });
  }

  return NextResponse.json({ received: true, activated: true });
}
