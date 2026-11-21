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
    <main className="mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 font-sans pb-28 md:pb-12 space-y-4 sm:space-y-6">
      {/* App Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Scorecards
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Past mock test attempts &amp; results
          </p>
        </div>

        <Link
          href="/tests"
          prefetch={true}
          className="rounded-xl bg-[#2E3AE3] hover:bg-[#2029B8] px-3.5 py-2 text-xs font-bold text-white shadow-xs active:scale-95 transition-all shrink-0"
        >
          New Test
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-2xl text-[#2E3AE3]">
            📝
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">No test attempts yet</h3>
          <p className="mt-1 max-w-md mx-auto text-xs text-slate-500">
            You haven&apos;t taken any mock tests yet. Take a test to evaluate your preparation.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/tests"
              prefetch={true}
              className="rounded-xl bg-[#2E3AE3] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#2029B8] transition-all"
            >
              Start a Mock Test
            </Link>
            <Link
              href="/learning"
              prefetch={true}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Explore Curriculum
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                {/* Header Row: Status, Exam Badge, Date */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                        isSubmitted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-300 animate-pulse"
                      }`}
                    >
                      {isSubmitted ? "✓ Submitted" : "In Progress"}
                    </span>
                    {att.test?.exam && (
                      <span className="rounded-lg bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold uppercase text-[#2E3AE3] border border-[#2E3AE3]/15 shrink-0">
                        {att.test.exam.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium shrink-0 truncate">
                    {formattedDate}
                  </span>
                </div>

                {/* Test Name */}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {att.test?.name || "Practice Entrance Exam"}
                </h3>

                {/* Score Stats Grid */}
                {isSubmitted ? (
                  <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50/80 p-2.5 border border-slate-100 text-center">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</span>
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {att.score.toFixed(1)} <span className="text-[10px] font-medium text-slate-400">/{att.max_score.toFixed(0)}</span>
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</span>
                      <span className="text-xs sm:text-sm font-black text-slate-900">{accuracy}%</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Correct</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-700">{att.correct_count}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-500">Wrong</span>
                      <span className="text-xs sm:text-sm font-black text-rose-600">{att.incorrect_count}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-900">
                      Exam is currently in progress. Tap resume below to continue.
                    </p>
                  </div>
                )}

                {/* Bottom Action Buttons: Clean 50/50 Grid */}
                <div className="pt-1">
                  {isSubmitted ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/attempts/${att.id}/result`}
                        prefetch={true}
                        className="h-10 sm:h-11 w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center transition-all active:scale-95 text-center"
                      >
                        Scorecard
                      </Link>
                      <Link
                        href={`/attempts/${att.id}/review`}
                        prefetch={true}
                        className="h-10 sm:h-11 w-full rounded-xl bg-[#2E3AE3] hover:bg-[#2029B8] text-white font-bold text-xs flex items-center justify-center transition-all active:scale-95 text-center"
                      >
                        Solutions
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/attempts/${att.id}`}
                      prefetch={true}
                      className="h-10 sm:h-11 w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center transition-all active:scale-95 text-center"
                    >
                      Resume Test
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
