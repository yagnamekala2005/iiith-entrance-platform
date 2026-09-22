import Link from "next/link";
import { getPublishedTests, getPublishedExams } from "@/lib/content/queries";

interface PageProps {
  searchParams: Promise<{ exam?: string }>;
}

export default async function TestsDirectoryPage({ searchParams }: PageProps) {
  const { exam: examFilter } = await searchParams;
  const [tests, exams] = await Promise.all([
    getPublishedTests(examFilter),
    getPublishedExams(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Test Series</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Mock & Practice Tests
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Realistic entrance simulations configured with official section timings, question counts, and marking schemes.
        </p>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/tests"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              !examFilter
                ? "bg-teal-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
            }`}
          >
            All Exams ({tests.length})
          </Link>
          {exams.map((exam) => {
            const isSelected = examFilter === exam.slug;
            return (
              <Link
                key={exam.id}
                href={`/tests?exam=${exam.slug}`}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-teal-700 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {exam.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tests Grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {tests.length === 0 ? (
          <div className="col-span-2 border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No tests available matching this filter.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className="flex flex-col justify-between border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-teal-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">
                    {test.exam?.slug.toUpperCase() || "MOCK"} &bull; {test.test_type.toUpperCase()}
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {test.status}
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-bold text-slate-900">{test.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{test.description}</p>

                {/* Section breakdown pills */}
                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sections ({test.sections.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {test.sections.map((ts) => (
                      <span
                        key={ts.id}
                        className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {ts.section.name} &bull; {Math.round((ts.duration_seconds || 0) / 60)}m
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{test.total_questions} Questions</span>
                  <span> &bull; </span>
                  <span className="font-semibold text-slate-800">{Math.round(test.duration_seconds / 60)} Mins</span>
                </div>
                <Link
                  href={`/tests/${test.slug}`}
                  className="rounded-md bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

