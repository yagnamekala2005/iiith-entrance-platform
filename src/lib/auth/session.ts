import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-memoized helper to get the currently authenticated Supabase user.
 * Calling this across layout.tsx, page.tsx, and components within the same HTTP request
 * will only execute the remote Supabase auth network call once.
 */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Request-memoized helper to get the current user and their admin status.
 * Eliminates duplicate network calls to auth.getUser() and admin_users.
 */
export const getCachedUserAndRole = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, isAdmin: false };
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, isAdmin: !!adminMembership };
});

