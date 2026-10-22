import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limit = await checkRateLimit("subscription-plans-ip", 60, 600, undefined, request.headers);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("mock_test_subscription_plans")
      .select("id,name,price_paise,duration_months,display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Load subscription plans failed:", error);
      return NextResponse.json({ error: "Subscription plans are not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ plans: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Subscription plan API error:", error);
    return NextResponse.json({ error: "Could not load subscription plans." }, { status: 500 });
  }
}
