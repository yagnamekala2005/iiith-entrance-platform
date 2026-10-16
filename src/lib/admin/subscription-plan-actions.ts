"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeAdminAction } from "@/lib/admin/authorization";
import {
  subscriptionPlanSchema,
  toggleSubscriptionPlanSchema,
  validateInput,
} from "@/lib/security/validation";

export interface SubscriptionPlanInput {
  id?: string;
  name: string;
  priceRupees: number;
  durationMonths: number;
  displayOrder?: number;
  isActive?: boolean;
}

async function getAuthorizedAdmin() {
  const authorization = await authorizeAdminAction();
  if (!authorization.ok) return { error: authorization.error };
  return { admin: createAdminClient() };
}

export async function saveSubscriptionPlan(input: SubscriptionPlanInput) {
  try {
    const auth = await getAuthorizedAdmin();
    if ("error" in auth) return { success: false, error: auth.error };
    const validation = validateInput<SubscriptionPlanInput>(subscriptionPlanSchema, input);
    if (validation.error || !validation.value) {
      return { success: false, error: validation.error || "Invalid subscription plan." };
    }
    input = validation.value;

    const name = input.name.trim();
    const priceRupees = Number(input.priceRupees);
    const durationMonths = Number(input.durationMonths);
    if (!name || name.length > 80) return { success: false, error: "Plan name must be between 1 and 80 characters." };
    if (!Number.isFinite(priceRupees) || priceRupees < 1 || priceRupees > 100000 || Math.round(priceRupees * 100) !== priceRupees * 100) {
      return { success: false, error: "Enter a valid price between ₹1 and ₹100,000 (up to 2 decimal places)." };
    }
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 24) {
      return { success: false, error: "Duration must be between 1 and 24 whole months." };
    }
    const payload = {
      name,
      price_paise: Math.round(priceRupees * 100),
      duration_months: durationMonths,
      display_order: Number.isInteger(input.displayOrder) ? input.displayOrder : 0,
      is_active: input.isActive !== false,
      updated_at: new Date().toISOString(),
    };
    const result = input.id
      ? await auth.admin.from("mock_test_subscription_plans").update(payload).eq("id", input.id).select("id").maybeSingle()
      : await auth.admin.from("mock_test_subscription_plans").insert(payload).select("id").maybeSingle();
    if (result.error || !result.data) {
      console.error("Save subscription plan failed:", result.error);
      return { success: false, error: "Could not save plan. Apply the subscription plans migration and try again." };
    }
    revalidatePath("/admin");
    revalidatePath("/admin/subscription-plans");
    revalidatePath("/tests");
    return { success: true };
  } catch (error) {
    console.error("saveSubscriptionPlan error:", error);
    return { success: false, error: "Unexpected error saving subscription plan." };
  }
}

export async function setSubscriptionPlanActive(id: string, isActive: boolean) {
  try {
    const auth = await getAuthorizedAdmin();
    if ("error" in auth) return { success: false, error: auth.error };
    const validation = validateInput<{ id: string; isActive: boolean }>(
      toggleSubscriptionPlanSchema,
      { id, isActive },
    );
    if (validation.error || !validation.value) {
      return { success: false, error: validation.error || "Invalid subscription plan update." };
    }
    ({ id, isActive } = validation.value);

    if (!id) return { success: false, error: "Choose a subscription plan." };
    const { error } = await auth.admin.from("mock_test_subscription_plans")
      .update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      console.error("Toggle subscription plan failed:", error);
      return { success: false, error: "Could not update plan. Apply the subscription plans migration and try again." };
    }
    revalidatePath("/admin/subscription-plans");
    revalidatePath("/tests");
    return { success: true };
  } catch (error) {
    console.error("setSubscriptionPlanActive error:", error);
    return { success: false, error: "Unexpected error updating subscription plan." };
  }
}
