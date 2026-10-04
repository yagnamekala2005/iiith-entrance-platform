import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserAttempts } from "@/lib/attempts/queries";

export default async function StudentAttemptsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const attempts = await getUserAttempts();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* 1-Step Back Navigation */}
      <div className="mb-3">
        <Link
          href="/dashboard"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to Student Dashboard"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <span className="text-blue-700">My Attempts & Scorecards</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
            Performance History
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            My Test Attempts & Scorecards
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Review detailed question-by-question breakdowns, attempted vs unattempted statistics, and official solutions.
          </p>
        </div>
        <Link
          href="/tests"
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
        >
          Take a Mock Test &rarr;
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
            📝
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">No attempts yet</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-slate-500">
            You haven&apos;t started any practice tests yet. Select a mock test to evaluate your readiness for IIITH entrance exams.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/tests"
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md hover:bg-blue-800 transition-all"
            >
              Start a Mock Test
            </Link>
            <Link
              href="/practice"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all"
            >
              Practice Syllabus
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {attempts.map((att) => {
            const isSubmitted = att.status === "submitted";
            const attemptedCount = att.correct_count + att.incorrect_count;
            const totalQuestions = att.total_questions || (att.test?.total_questions || attemptedCount);
            const unattemptedCount = Math.max(0, totalQuestions - attemptedCount);
            const accuracy = attemptedCount > 0 ? ((att.correct_count / attemptedCount) * 100).toFixed(0) : 0;
            const formattedDate = new Date(att.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            return (
              <div
                key={att.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        isSubmitted
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                      }`}
                    >
                      {isSubmitted ? "✓ Submitted" : "⏱️ In Progress"}
                    </span>
                    {att.test?.exam && (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase text-blue-800 border border-blue-200">
                        {att.test.exam.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    {att.test?.name || "Practice Entrance Exam"}
                  </h3>

                  {isSubmitted ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {/* Attempted vs Not Attempted Badges */}
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-blue-900 border border-blue-200">
                        Attempted: {attemptedCount}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-700 border border-slate-200">
                        Skipped: {unattemptedCount}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 border border-emerald-200">
                        ✓ {att.correct_count} Correct
                      </span>
                      <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-bold text-rose-800 border border-rose-200">
                        ✗ {att.incorrect_count} Wrong
                      </span>
                      <span className="text-slate-500 font-medium">
                        Score: <strong className="text-slate-900 font-bold">{att.score.toFixed(2)}</strong> / {att.max_score.toFixed(2)} ({accuracy}% Acc)
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 inline-block">
                      Attempt is actively in progress. The synchronized live timer is running. Click resume to continue answering questions.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isSubmitted ? (
                    <>
                      <Link
                        href={`/attempts/${att.id}/result`}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
                      >
                        Scorecard
                      </Link>
                      <Link
                        href={`/attempts/${att.id}/review`}
                        className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all flex items-center gap-1.5"
                      >
                        <span>Solutions</span>
                        <span>&rarr;</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/attempts/${att.id}`}
                      className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all"
                    >
                      Resume Test &rarr;
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
