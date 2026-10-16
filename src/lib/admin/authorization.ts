import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";

export type AdminActionAuthorization =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function authorizeAdminAction(): Promise<AdminActionAuthorization> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, error: "Authentication required." };

    const adminClient = createAdminClient();
    const { data: membership, error: membershipError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Admin membership check failed:", membershipError);
      return { ok: false, error: "Unable to verify admin authorization." };
    }
    if (!membership) return { ok: false, error: "Admin authorization required." };

    const rateLimit = await checkRateLimit(
      "admin-actions",
      60,
      60,
      user.id,
    );
    if (!rateLimit.allowed) return { ok: false, error: "Too many administrative requests. Try again shortly." };

    return { ok: true, userId: user.id };
  } catch (error) {
    console.error("Admin authorization failed:", error);
    return { ok: false, error: "Unable to verify admin authorization." };
  }
}
