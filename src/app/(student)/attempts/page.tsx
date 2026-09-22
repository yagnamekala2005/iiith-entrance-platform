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
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/dashboard" className="hover:text-teal-800">Dashboard</Link>
        <span>/</span>
        <span className="text-teal-700">My Attempts</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My Test Attempts
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Track your completed tests, review answers, and resume active practice sets.
          </p>
        </div>
        <Link
          href="/tests"
          className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800"
        >
          Browse Mock Tests &rarr;
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            📝
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">No attempts yet</h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-slate-500">
            You haven&apos;t started any practice tests yet. Select a mock test to evaluate your readiness for IIITH entrance exams.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/tests"
              className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Start a Mock Test
            </Link>
            <Link
              href="/practice"
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        isSubmitted
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                      }`}
                    >
                      {isSubmitted ? "Submitted" : "In Progress"}
                    </span>
                    {att.test?.exam && (
                      <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                        {att.test.exam.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-500">{formattedDate}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {att.test?.name || "Practice Test"}
                  </h3>

                  {isSubmitted ? (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span>
                        Score: <strong className="text-slate-900">{att.score.toFixed(2)}</strong> / {att.max_score.toFixed(2)}
                      </span>
                      <span>&bull;</span>
                      <span>
                        Accuracy: <strong className="text-slate-900">{accuracy}%</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="text-emerald-700 font-medium">✓ {att.correct_count} correct</span>
                      <span>&bull;</span>
                      <span className="text-rose-600 font-medium">✗ {att.incorrect_count} wrong</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Attempt is currently active. Click resume to continue answering questions.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 sm:mt-0">
                  {isSubmitted ? (
                    <>
                      <Link
                        href={`/attempts/${att.id}/result`}
                        className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Scorecard
                      </Link>
                      <Link
                        href={`/attempts/${att.id}/review`}
                        className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800"
                      >
                        Review Answers &rarr;
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/attempts/${att.id}`}
                      className="rounded-md bg-amber-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-xs hover:bg-amber-700"
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
