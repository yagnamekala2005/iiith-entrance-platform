import Link from "next/link";
import { getPublishedTests, getPublishedExams } from "@/lib/content/queries";
import { StartAttemptButton } from "@/components/attempts/start-attempt-button";

export const dynamic = "force-dynamic";

const OLD_TEST_IDS = new Set([
  "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
  "64a2c6a7-77eb-426e-bc3f-c492865aac77",
  "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
]);

interface PageProps {
  searchParams: Promise<{ exam?: string }>;
}

export default async function TestsDirectoryPage({ searchParams }: PageProps) {
  const { exam: examFilter } = await searchParams;
  const [rawTests, exams] = await Promise.all([
    getPublishedTests(examFilter),
    getPublishedExams(),
  ]);

  const tests = rawTests.filter((t) => !OLD_TEST_IDS.has(t.id));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">


      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              CBT Simulation Center
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Competitive Exam Mock Tests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Realistic computer-based mock tests for competitive examinations with live countdown timers, auto-submission on expiration, and detailed scorecards.
            </p>
          </div>
          <Link
            href="/attempts"
            prefetch={true}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            My Past Scorecards &rarr;
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/tests"
            prefetch={true}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs ${
              !examFilter
                ? "bg-blue-700 text-white shadow-blue-700/20"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            All Competitive Exams ({tests.length})
          </Link>
          {exams.map((exam) => {
            const isSelected = examFilter === exam.slug;
            return (
              <Link
                key={exam.id}
                href={`/tests?exam=${exam.slug}`}
                prefetch={true}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                  isSelected
                    ? "bg-blue-700 text-white shadow-blue-700/20"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {exam.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tests Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {tests.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <span className="text-4xl">📚</span>
            <h3 className="mt-3 text-lg font-bold text-slate-900">No mock tests found</h3>
            <p className="mt-1 text-sm text-slate-500">No mock tests currently match the selected entrance program.</p>
            <Link
              href="/tests"
              className="mt-4 inline-block rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md hover:bg-blue-800"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          tests.map((test) => {
            const durationMinutes = Math.round(test.duration_seconds / 60);
            return (
              <div
                key={test.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                      {test.exam?.name || "Competitive Exam"} &bull; {test.test_type.toUpperCase()}
                    </span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Timed CBT
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {test.name}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                    {test.description}
                  </p>

                  {/* Section breakdown pills */}
                  {test.sections && test.sections.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Exam Sections ({test.sections.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {test.sections.map((ts) => (
                          <span
                            key={ts.id}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 font-medium"
                          >
                            {ts.section.name} &bull; {Math.round((ts.duration_seconds || 0) / 60)}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
                  <div className="text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{test.total_questions} Questions</span>
                      <span>&bull;</span>
                      <span className="font-extrabold text-slate-900 text-sm">{durationMinutes} Mins</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Auto-submit on expiry</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/tests/${test.slug}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                    >
                      Instructions
                    </Link>
                    <StartAttemptButton testId={test.id} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

