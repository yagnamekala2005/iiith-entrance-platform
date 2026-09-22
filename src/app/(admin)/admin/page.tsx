import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-300">Protected workspace</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Administration foundation</h1>
      <p className="mt-4 max-w-2xl text-slate-400">
        Current session: {user.email}.
      </p>
    </main>
  );
}
