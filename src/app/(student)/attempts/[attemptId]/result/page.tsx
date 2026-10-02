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

  const {
    attempt,
    test,
    accuracy_percentage,
    attempted_count,
    unattempted_count,
    subject_results,
    section_results,
  } = result;

  const totalQuestions = attempt.total_questions || attempted_count + unattempted_count;
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
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8 font-sans">
      {/* 1-Step Back Navigation */}
      <div className="mb-3">
        <Link
          href="/attempts"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to My Attempts"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Back to My Attempts</span>
        </Link>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <Link href="/attempts" className="hover:text-blue-700">My Attempts</Link>
        <span>/</span>
        <span className="text-blue-700 font-extrabold">Scorecard & Analysis</span>
      </div>

      {/* Header Banner */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 border border-emerald-200">
                Exam Successfully Submitted
              </span>
              <span className="rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                {test.exam?.name || "IIITH Entrance"}
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {test.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Completed on <strong className="text-slate-700">{submittedDate}</strong> &bull; Server Evaluated
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/attempts/${attempt.id}/review`}
              className="rounded-xl bg-blue-700 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Review Solutions & Explanations</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Attempted vs Not Attempted vs Accuracy vs Score (2 Cols on Mobile, 4 on Desktop) */}
      <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Attempted Questions Card */}
        <div className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-blue-600"></div>
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-900">
            Total Attempted
          </p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-blue-950">{attempted_count}</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {totalQuestions}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-blue-700">
            {((attempted_count / (totalQuestions || 1)) * 100).toFixed(0)}% of questions
          </p>
        </div>

        {/* Not Attempted / Skipped Card */}
        <div className="rounded-2xl border border-amber-200 bg-white p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-amber-500"></div>
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-900">
            Not Attempted
          </p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-amber-900">{unattempted_count}</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {totalQuestions}</span>
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-amber-600">
            {((unattempted_count / (totalQuestions || 1)) * 100).toFixed(0)}% left blank
          </p>
        </div>

        {/* Final Score */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-slate-700"></div>
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-600">
            Final Test Score
          </p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className={`text-3xl sm:text-4xl font-black ${isPassingScore ? "text-emerald-700" : "text-slate-900"}`}>
              {attempt.score.toFixed(2)}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {attempt.max_score.toFixed(2)}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 font-medium">
            {((attempt.score / (attempt.max_score || 1)) * 100).toFixed(1)}% Marks
          </p>
        </div>

        {/* Accuracy */}
        <div className="rounded-2xl border border-indigo-200 bg-white p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600"></div>
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-900">
            Accuracy Rate
          </p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black text-indigo-950">{accuracy_percentage.toFixed(1)}%</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <span className="text-emerald-700 font-bold">✓ {attempt.correct_count} correct</span>
            <span className="text-rose-600 font-bold">✗ {attempt.incorrect_count} wrong</span>
          </div>
        </div>
      </div>

      {/* 4 Subjects Performance Breakdown */}
      {subject_results && subject_results.length > 0 && (
        <section className="mt-8 sm:mt-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Subject-Wise Performance Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of attempted vs. not attempted questions across Mathematics, Physics, Chemistry, and Aptitude.
              </p>
            </div>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
              4 Core Subjects
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Subject</th>
                    <th className="px-4 py-3.5 text-center">Questions</th>
                    <th className="px-4 py-3.5 text-center text-blue-800">Attempted</th>
                    <th className="px-4 py-3.5 text-center text-amber-700">Skipped</th>
                    <th className="px-4 py-3.5 text-center text-emerald-700">Correct</th>
                    <th className="px-4 py-3.5 text-center text-rose-600">Wrong</th>
                    <th className="px-5 py-3.5 text-right">Score</th>
                    <th className="px-5 py-3.5 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subject_results.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {sub.subject_name}
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                        {sub.total_questions}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-blue-800 bg-blue-50/40">
                        {sub.attempted_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-700 bg-amber-50/40">
                        {sub.unattempted_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                        {sub.correct_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-rose-600">
                        {sub.incorrect_count}
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {sub.score.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/ {sub.max_score.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-indigo-700">
                        {sub.accuracy.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Section Results (if multiple sections exist) */}
      {section_results && section_results.length > 1 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-slate-900">Official Exam Sections</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Section</th>
                    <th className="px-4 py-3 text-center">Questions</th>
                    <th className="px-4 py-3 text-center text-emerald-700">Correct</th>
                    <th className="px-4 py-3 text-center text-rose-700">Incorrect</th>
                    <th className="px-4 py-3 text-center">Unanswered</th>
                    <th className="px-5 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {section_results.map((sec, idx) => (
                    <tr key={idx}>
                      <td className="px-5 py-3 font-semibold text-slate-900">{sec.section_name}</td>
                      <td className="px-4 py-3 text-center">{sec.total_questions}</td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700">{sec.correct_count}</td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-600">{sec.incorrect_count}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{sec.unanswered_count}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">
                        {sec.score.toFixed(2)} / {sec.max_score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Actions Footer */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <Link
          href="/dashboard"
          className="text-xs font-bold uppercase text-slate-600 hover:text-slate-900"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/tests"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all"
          >
            Take Another Mock Test
          </Link>
          <Link
            href={`/attempts/${attempt.id}/review`}
            className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 transition-all"
          >
            Review Detailed Solutions &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
