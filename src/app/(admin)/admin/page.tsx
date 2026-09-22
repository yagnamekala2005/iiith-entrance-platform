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

  // Admin content queries
  const [
    { count: totalQuestions },
    { count: publishedQuestions },
    { count: totalTests },
    { count: totalSubjects },
  ] = await Promise.all([
    supabase.from("questions").select("*", { count: "exact", head: true }),
    supabase.from("questions").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("tests").select("*", { count: "exact", head: true }),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="border-b border-slate-800 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-300">Protected workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Administration Foundation</h1>
        <p className="mt-2 text-slate-400">
          Authenticated Administrator: <span className="font-mono text-teal-300">{user.email}</span>
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <div className="border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total Questions</p>
          <p className="mt-2 text-3xl font-bold text-teal-300">{totalQuestions ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">{publishedQuestions ?? 0} published</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400">Published Tests</p>
          <p className="mt-2 text-3xl font-bold text-teal-300">{totalTests ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">Active test configurations</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400">Subjects</p>
          <p className="mt-2 text-3xl font-bold text-teal-300">{totalSubjects ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">PCM + Aptitude</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-400">Answer Key Security</p>
          <p className="mt-2 text-xl font-bold text-emerald-400">Enforced</p>
          <p className="mt-1 text-xs text-slate-400">RLS restricts to admins</p>
        </div>
      </div>

      <div className="mt-10 rounded-md border border-slate-800 bg-slate-900/30 p-6">
        <h2 className="text-lg font-semibold text-white">Phase 2 Content Architecture Active</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          The database schema supports Exam &rarr; Section &rarr; Subject &rarr; Chapter &rarr; Topic &rarr; Question &rarr; Options hierarchy with protected answer keys. Full GUI authoring tools will be integrated in Phase 7.
        </p>
      </div>
    </main>
  );
}
