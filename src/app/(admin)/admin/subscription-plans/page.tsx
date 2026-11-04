import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubscriptionPlansManager, type SubscriptionPlanRow } from "@/components/admin/subscription-plans-manager";

export const dynamic = "force-dynamic";

export default async function SubscriptionPlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/subscription-plans");

  const admin = createAdminClient();
  const { data: membership } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!membership) redirect("/dashboard");

  const { data, error } = await admin.from("mock_test_subscription_plans")
    .select("id,name,price_paise,duration_months,is_active,display_order")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const plans = (data || []) as SubscriptionPlanRow[];
  return (
    <main className="min-h-screen bg-slate-50">
      {error && <div className="mx-auto max-w-5xl px-4 pt-6 text-sm font-semibold text-rose-700">Could not load plans. Apply the subscription plans migration in Supabase, then refresh this page.</div>}
      <SubscriptionPlansManager initialPlans={plans} />
    </main>
  );
}
