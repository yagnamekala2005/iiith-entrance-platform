import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Typed with <any> to match @supabase/ssr untyped schema behavior
let publicClientInstance: SupabaseClient<any, any, any> | null = null;

/**
 * High-performance, cookie-free Supabase client singleton for fetching
 * publicly-readable educational content (exams, tests, syllabus, topics).
 * Since it doesn't touch request cookies, its queries can be safely cached
 * in memory across requests using Next.js unstable_cache.
 */
export function createPublicServerClient(): SupabaseClient<any, any, any> {
  if (publicClientInstance) {
    return publicClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  publicClientInstance = createClient<any>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return publicClientInstance;
}

