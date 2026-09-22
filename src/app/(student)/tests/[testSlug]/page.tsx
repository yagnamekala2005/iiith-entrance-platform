import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestBySlug } from "@/lib/content/queries";
import { getActiveAttemptForTest } from "@/lib/attempts/queries";
import { StartAttemptButton } from "@/components/attempts/start-attempt-button";

interface PageProps {
  params: Promise<{ testSlug: string }>;
}

export default async function TestDetailPage({ params }: PageProps) {
  const { testSlug } = await params;
  const test = await getTestBySlug(testSlug);

  if (!test) {
    notFound();
  }

  const activeAttempt = await getActiveAttemptForTest(test.id);

  const durationMinutes = Math.round(test.duration_seconds / 60);
  const durationHours = (durationMinutes / 60).toFixed(1);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/tests" className="hover:text-teal-800">Mock Tests</Link>
        <span>/</span>
        <span className="text-teal-700">{test.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-teal-800">
                {test.exam?.name || "ENTRANCE MOCK"}
              </span>
              <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase text-slate-600">
                {test.test_type}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {test.name}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">{test.description}</p>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Duration</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{durationMinutes} minutes</p>
          <p className="mt-0.5 text-xs text-slate-500">({durationHours} hours timed pattern)</p>
        </div>
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Questions</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{test.total_questions}</p>
          <p className="mt-0.5 text-xs text-slate-500">Curated & verified</p>
        </div>
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Marks</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{test.total_marks}</p>
          <p className="mt-0.5 text-xs text-slate-500">With negative marking</p>
        </div>
      </div>

      {/* Section Structure */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Section Configuration</h2>
        <p className="mt-1 text-sm text-slate-500">
          This test includes {test.sections.length} independent timed sections.
        </p>

        <div className="mt-4 overflow-hidden border border-slate-200 bg-white">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Section</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Marking Scheme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {test.sections.map((ts) => (
                <tr key={ts.id}>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {ts.section.name}
                  </td>
                  <td className="px-6 py-4">
                    {Math.round((ts.duration_seconds || ts.section.default_duration_seconds) / 60)} minutes
                  </td>
                  <td className="px-6 py-4">
                    +{ts.marks_per_question ?? 1.0} for correct &bull; -{ts.negative_marks ?? 0.25} for incorrect
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Instructions */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Test Instructions</h2>
        <div className="mt-4 rounded-md border border-slate-200 bg-white p-6">
          <p className="leading-relaxed text-slate-700 whitespace-pre-wrap">
            {test.instructions || "Please ensure a stable internet connection. Each section will be timed according to the official examination pattern."}
          </p>
        </div>
      </section>

      {/* Start / Resume Practice Attempt action */}
      <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
        <Link
          href="/tests"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          &larr; Back to Tests
        </Link>
        <div className="flex items-center gap-3">
          <StartAttemptButton
            testId={test.id}
            hasActiveAttempt={Boolean(activeAttempt)}
            activeAttemptId={activeAttempt?.id}
          />
        </div>
      </div>
    </main>
  );
}
