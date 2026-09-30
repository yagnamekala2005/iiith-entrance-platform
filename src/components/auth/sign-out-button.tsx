"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="text-slate-500 font-semibold hover:text-rose-600 transition-colors" onClick={handleSignOut} type="button">
      Sign out
    </button>
  );
}
