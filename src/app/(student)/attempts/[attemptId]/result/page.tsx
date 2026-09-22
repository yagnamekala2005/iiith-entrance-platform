import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttemptResult } from "@/lib/attempts/queries";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptResultPage({ params }: PageProps) {
  const { attemptId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await getAttemptResult(attemptId);

  if (!result) {
    notFound();
  }

  const { attempt, test, accuracy_percentage, section_results } = result;
  const isPassingScore = attempt.score > 0 && attempt.score >= attempt.max_score * 0.4;

  const submittedDate = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Recently";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/attempts" className="hover:text-teal-800">My Attempts</Link>
        <span>/</span>
        <span className="text-teal-700">Result Scorecard</span>
      </div>

      {/* Header */}
      <div className="mt-4 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded bg-teal-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-800">
              Test Completed
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {test.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submitted on {submittedDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/attempts/${attempt.id}/review`}
              className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800"
            >
              Review Answers & Explanations &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Scorecard Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Score */}
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Score</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${isPassingScore ? "text-teal-800" : "text-slate-900"}`}>
              {attempt.score.toFixed(2)}
            </span>
            <span className="text-base font-medium text-slate-400">/ {attempt.max_score.toFixed(2)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {((attempt.score / (attempt.max_score || 1)) * 100).toFixed(1)}% of maximum marks
          </p>
        </div>

        {/* Accuracy */}
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accuracy</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {accuracy_percentage.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            On attempted questions
          </p>
        </div>

        {/* Correct Answers */}
        <div className="border border-emerald-100 bg-emerald-50/40 p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Correct</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">
            {attempt.correct_count}
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            +{attempt.correct_count} marks awarded
          </p>
        </div>

        {/* Incorrect & Unanswered */}
        <div className="border border-slate-200 bg-white p-6 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Incorrect / Skipped</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-rose-600">
              {attempt.incorrect_count} <span className="text-xs font-normal text-slate-500">wrong</span>
            </span>
            <span className="text-2xl font-bold text-slate-600">
              {attempt.unanswered_count} <span className="text-xs font-normal text-slate-500">skipped</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {attempt.total_questions} total questions
          </p>
        </div>
      </div>

      {/* Section Performance Breakdown */}
      {section_results && section_results.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Section-Wise Performance</h2>
          <div className="mt-4 overflow-hidden border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Section</th>
                  <th className="px-6 py-3">Questions</th>
                  <th className="px-6 py-3 text-emerald-700">Correct</th>
                  <th className="px-6 py-3 text-rose-700">Incorrect</th>
                  <th className="px-6 py-3">Unanswered</th>
                  <th className="px-6 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {section_results.map((sec, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {sec.section_name}
                    </td>
                    <td className="px-6 py-4">
                      {sec.total_questions}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-700">
                      {sec.correct_count}
                    </td>
                    <td className="px-6 py-4 font-semibold text-rose-600">
                      {sec.incorrect_count}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {sec.unanswered_count}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {sec.score.toFixed(2)} / {sec.max_score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Action Footer */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <Link
          href="/attempts"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          &larr; View All My Attempts
        </Link>
        <div className="flex gap-3">
          <Link
            href="/tests"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Explore More Tests
          </Link>
          <Link
            href={`/attempts/${attempt.id}/review`}
            className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800"
          >
            Review Detailed Solutions &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

