import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/security/body";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasValidOrigin } from "@/lib/security/origin";
import { testOrderSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return jsonError("Invalid request origin.", 403);

  try {
    const ipLimit = await checkRateLimit("payment-create-order-ip", 20, 600, undefined, request.headers);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: "Too many payment requests. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSeconds) },
      });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonError("Please sign in before purchasing a mock test.", 401);

    const userLimit = await checkRateLimit("payment-create-order-user", 5, 600, user.id, request.headers);
    if (!userLimit.allowed) return NextResponse.json({ error: "Too many payment requests. Try again later." }, { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } });

    const body = await readJsonBody(request, 16 * 1024);
    if (!body.ok) return jsonError("Invalid payment request.", body.status);
    const validation = validateInput<{ testId: string }>(testOrderSchema, body.value);
    if (validation.error || !validation.value) return jsonError("A valid mock test is required.", 400);
    const testId = validation.value.testId;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error("Razorpay environment variables are missing.");
      return jsonError("Payments are not configured yet. Please try again later.", 503);
    }

    const admin = createAdminClient();
    const { data: test, error: testError } = await admin
      .from("tests")
      .select("id, name, test_type, status, is_free, price_paise")
      .eq("id", testId)
      .maybeSingle();

    if (testError || !test) return jsonError("Mock test not found.", 404);
    if (test.status !== "published" || test.test_type !== "mock") {
      return jsonError("Only published mock tests can be purchased.", 400);
    }
    if (test.is_free) return jsonError("This mock test is already free for all students.", 409);

    const { data: existingPurchase, error: purchaseLookupError } = await admin
      .from("mock_test_purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("test_id", test.id)
      .maybeSingle();

    if (purchaseLookupError) {
      console.error("Purchase lookup failed:", purchaseLookupError);
      return jsonError("Could not check your purchase status.", 500);
    }
    if (existingPurchase?.status === "paid") {
      return NextResponse.json({ alreadyPurchased: true, message: "You already own this mock test." });
    }

    const amount = Number(test.price_paise);
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return jsonError("The mock test price is invalid. Set a price of at least ₹1 in Supabase.", 500);
    }

    const receipt = "mt_" + test.id.replace(/-/g, "").slice(0, 12) + "_" + user.id.replace(/-/g, "").slice(0, 12);
    const credentials = Buffer.from(keyId + ":" + keySecret).toString("base64");
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + credentials,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { user_id: user.id, test_id: test.id },
      }),
      cache: "no-store",
    });

    const order = await razorpayResponse.json().catch(() => null) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    } | null;

    if (!razorpayResponse.ok || !order?.id) {
      console.error("Razorpay order creation failed:", order?.error?.description || razorpayResponse.status);
      return jsonError("Razorpay could not create the order. Please try again.", 502);
    }

    const { error: saveError } = await admin
      .from("mock_test_purchases")
      .upsert({
        user_id: user.id,
        test_id: test.id,
        status: "pending",
        amount_paise: amount,
        provider_order_id: order.id,
        provider_payment_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,test_id" });

    if (saveError) {
      console.error("Could not save pending mock test purchase:", saveError);
      return jsonError("The order was created but could not be saved. Contact support before retrying.", 500);
    }

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount,
      currency: "INR",
      testName: test.name,
      studentEmail: user.email || undefined,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    return jsonError("Unexpected error while starting payment.", 500);
  }
}
