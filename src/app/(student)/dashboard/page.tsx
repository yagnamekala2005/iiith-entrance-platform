import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Student dashboard</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Your preparation starts here.</h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Signed in as {user.email}.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["UGEE", "SUPR + REAP"],
          ["SPEC", "Subject proficiency"],
          ["Progress", "Coming in the next phase"],
        ].map(([title, detail]) => (
          <div className="border border-slate-200 bg-white p-5" key={title}>
            <p className="text-lg font-semibold text-slate-900">{title}</p>
            <p className="mt-2 text-sm text-slate-600">{detail}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
