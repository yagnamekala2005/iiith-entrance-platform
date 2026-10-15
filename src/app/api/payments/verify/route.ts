import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Please sign in to verify this payment.", 401);

    const body = await request.json().catch(() => null) as {
      testId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } | null;

    const testId = body?.testId?.trim();
    const orderId = body?.razorpay_order_id?.trim();
    const paymentId = body?.razorpay_payment_id?.trim();
    const signature = body?.razorpay_signature?.trim();
    if (!testId || !orderId || !paymentId || !signature) {
      return jsonError("Payment verification details are incomplete.", 400);
    }

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
    let received: Buffer;
    try {
      received = Buffer.from(signature, "hex");
    } catch {
      return jsonError("Invalid payment signature.", 400);
    }
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
