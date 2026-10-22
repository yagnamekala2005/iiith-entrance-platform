import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import { mockPaymentVerificationSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid request origin.", 403);

  try {
    const ipLimit = await checkRateLimit("payment-verify-ip", 30, 600, undefined, request.headers);
    if (!ipLimit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Please sign in to verify this payment.", 401);

    const userLimit = await checkRateLimit("payment-verify-user", 10, 600, user.id, request.headers);
    if (!userLimit.allowed) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } });

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return jsonError("Invalid payment verification request.", body.status);
    const validation = validateInput<{
      testId: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>(mockPaymentVerificationSchema, body.value);
    if (validation.error || !validation.value) {
      return jsonError("Payment verification details are incomplete.", 400);
    }
    const { testId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = validation.value;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return jsonError("Payments are not configured.", 503);

    const admin = createAdminClient();
    const { data: purchase, error: purchaseError } = await admin
      .from("mock_test_purchases")
      .select("id, user_id, test_id, status, amount_paise, provider_order_id, provider_payment_id")
      .eq("user_id", user.id)
      .eq("test_id", testId)
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (purchaseError || !purchase) {
      return jsonError("No matching payment order was found for your account.", 404);
    }
    if (purchase.status === "paid" && purchase.provider_payment_id === paymentId) {
      return NextResponse.json({ verified: true, alreadyVerified: true });
    }
    if (purchase.status !== "pending") {
      return jsonError("This payment order is no longer pending.", 409);
    }

    const expected = createHmac("sha256", keySecret).update(orderId + "|" + paymentId).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return jsonError("Payment signature verification failed.", 400);
    }

    const credentials = Buffer.from(keyId + ":" + keySecret).toString("base64");
    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Basic " + credentials },
      cache: "no-store",
    });
    const payment = await paymentResponse.json().catch(() => null) as {
      id?: string;
      order_id?: string;
      amount?: number;
      currency?: string;
      status?: string;
    } | null;

    if (!paymentResponse.ok || !payment) return jsonError("Could not confirm payment status with Razorpay.", 502);
    if (
      payment.id !== paymentId ||
      payment.order_id !== orderId ||
      payment.amount !== purchase.amount_paise ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return jsonError("Payment is not captured for the expected amount. Access has not been unlocked.", 402);
    }

    const { data: updated, error: updateError } = await admin
      .from("mock_test_purchases")
      .update({
        status: "paid",
        provider_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      console.error("Could not mark verified mock test purchase as paid:", updateError);
      return jsonError("Payment was verified, but access could not be saved. Contact support with your Razorpay payment ID.", 500);
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return jsonError("Unexpected error while verifying payment.", 500);
  }
}
