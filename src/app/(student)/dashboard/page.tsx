import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublishedExams, getPublishedTests, getSubjectsWithHierarchy } from "@/lib/content/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [exams, tests, subjects] = await Promise.all([
    getPublishedExams(),
    getPublishedTests(),
    getSubjectsWithHierarchy(),
  ]);

  const totalTopics = subjects.reduce(
    (acc, sub) => acc + sub.chapters.reduce((cAcc, chap) => cAcc + chap.topics.length, 0),
    0
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Student dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Welcome back.
          </h1>
          <p className="mt-2 text-slate-600">
            Account: <span className="font-medium text-slate-800">{user.email}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/practice"
            className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
          >
            Explore Practice
          </Link>
          <Link
            href="/tests"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-800"
          >
            View Mock Tests
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Exams</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{exams.length || 2}</p>
          <p className="mt-1 text-sm text-slate-600">IIITH UGEE (SUPR + REAP) & SPEC</p>
        </div>
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Curated Topics</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalTopics || 11}</p>
          <p className="mt-1 text-sm text-slate-600">Across Math, Physics, Chemistry, Aptitude</p>
        </div>
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Tests</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{tests.length || 2}</p>
          <p className="mt-1 text-sm text-slate-600">Full exam simulations & targeted sets</p>
        </div>
      </div>

      {/* Target Exams cards */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">Target Entrance Programs</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {exams.map((exam) => (
            <div key={exam.id} className="flex flex-col justify-between border border-slate-200 bg-white p-6 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">
                    {exam.slug.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    Negative marking: {(Number(exam.negative_marking_ratio || 0.25) * 100).toFixed(0)}%
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{exam.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{exam.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={`/practice/${exam.slug}`}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  Browse Exam Sections &rarr;
                </Link>
                <Link
                  href={`/tests?exam=${exam.slug}`}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  View Mocks
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Practice by Subject */}
      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Practice by Subject</h2>
          <Link href="/practice" className="text-sm font-medium text-teal-700 hover:text-teal-900">
            View full syllabus &rarr;
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((sub) => (
            <Link
              key={sub.id}
              href="/practice"
              className="group border border-slate-200 bg-white p-5 transition-all hover:border-teal-600 hover:shadow-xs"
            >
              <p className="text-base font-semibold text-slate-900 group-hover:text-teal-800">{sub.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {sub.chapters.length} chapters &bull; {sub.chapters.reduce((a, c) => a + c.topics.length, 0)} topics
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
