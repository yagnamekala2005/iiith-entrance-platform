import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getUserAttempts } from "@/lib/attempts/queries";

export default async function StudentAttemptsPage() {
  const user = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  const attempts = await getUserAttempts(user.id);

  return (
    <main className="mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-8 lg:px-8 font-sans pb-28 md:pb-12">
      {/* 1-Step Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/dashboard"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to Student Dashboard"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Dashboard</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Link href="/dashboard" className="hover:text-[#2E3AE3]">Dashboard</Link>
          <span>/</span>
          <span className="text-[#2E3AE3]">Attempts</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
            Performance History
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F2227]">
            My Exam Scorecards & Attempts
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-2xl">
            Review detailed question-by-question breakdowns, attempted vs unattempted statistics, and official solutions.
          </p>
        </div>
        <Link
          href="/tests"
          prefetch={true}
          className="rounded-2xl bg-[#2E3AE3] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#2E3AE3]/25 hover:bg-[#252fb8] active:scale-95 transition-all"
        >
          Take a Mock Test &rarr;
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] text-2xl text-[#2E3AE3]">
            📝
          </div>
          <h3 className="mt-4 text-lg font-black text-[#1F2227]">No test attempts yet</h3>
          <p className="mt-2 max-w-md mx-auto text-xs sm:text-sm text-slate-500">
            You haven&apos;t started any CBT mock tests yet. Select an exam to evaluate your readiness for UGEE or SPEC.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/tests"
              prefetch={true}
              className="rounded-xl bg-[#2E3AE3] px-5 py-2.5 text-xs font-black uppercase text-white shadow-md hover:bg-[#252fb8] transition-all"
            >
              Start a Mock Test
            </Link>
            <Link
              href="/learning"
              prefetch={true}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all"
            >
              Explore Curriculum
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3.5">
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
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center gap-5"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isSubmitted
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-900 border border-amber-300 animate-pulse"
                      }`}
                    >
                      {isSubmitted ? "✓ Submitted" : "⏱️ In Progress"}
                    </span>
                    {att.test?.exam && (
                      <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#2E3AE3] border border-[#2E3AE3]/20">
                        {att.test.exam.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500 font-medium">{formattedDate}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-[#1F2227]">
                    {att.test?.name || "Practice Entrance Exam"}
                  </h3>

                  {isSubmitted ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
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
                      <span className="text-slate-500 font-medium ml-1">
                        Score: <strong className="text-[#1F2227] font-black">{att.score.toFixed(2)}</strong> / {att.max_score.toFixed(2)} ({accuracy}% Acc)
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 inline-block">
                      Attempt is actively in progress. The synchronized live timer is running. Click resume to continue answering questions.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isSubmitted ? (
                    <>
                      <Link
                        href={`/attempts/${att.id}/result`}
                        prefetch={true}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all active:scale-95"
                      >
                        Scorecard
                      </Link>
                      <Link
                        href={`/attempts/${att.id}/review`}
                        prefetch={true}
                        className="rounded-xl bg-[#2E3AE3] px-4 py-2 text-xs font-black text-white shadow-md shadow-[#2E3AE3]/25 hover:bg-[#252fb8] transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <span>Solutions</span>
                        <span>&rarr;</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/attempts/${att.id}`}
                      prefetch={true}
                      className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95"
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
