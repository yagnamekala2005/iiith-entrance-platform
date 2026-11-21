import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getAttemptResult } from "@/lib/attempts/queries";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptResultPage({ params }: PageProps) {
  const { attemptId } = await params;

  const user = await getCachedAuthUser();

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
          <Link href="/attempts" className="hover:text-[#2E3AE3]">Attempts</Link>
          <span>/</span>
          <span className="text-[#2E3AE3]">Scorecard</span>
        </div>
      </div>

      {/* Hero Scorecard Card (Prostuti Dark Slate Aesthetic) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1F2227] text-white p-5 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Exam Submitted & Graded
              </span>
              <span className="rounded-full bg-[#2E3AE3]/30 text-blue-200 border border-[#2E3AE3]/50 px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                {test.exam?.name || "IIITH Entrance"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {test.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300">
              Completed on <strong className="text-white">{submittedDate}</strong> &bull; Server Evaluated
            </p>
          </div>

          {/* Quick Score Circle & CTA */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-700/60">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall Score</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-3xl sm:text-4xl font-black ${isPassingScore ? "text-emerald-400" : "text-white"}`}>
                  {attempt.score.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {attempt.max_score.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href={`/attempts/${attempt.id}/review`}
              prefetch={true}
              className="rounded-2xl bg-[#2E3AE3] hover:bg-[#252fb8] px-5 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-[#2E3AE3]/35 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Review Solutions</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: 4 Cards */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Attempted */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Attempted</p>
            <span className="text-xs font-bold text-[#2E3AE3] bg-[#EEF2FF] px-2 py-0.5 rounded-md">
              {((attempted_count / (totalQuestions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[#1F2227]">{attempted_count}</span>
            <span className="text-xs text-slate-400 font-semibold">/ {totalQuestions}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Questions answered</p>
        </div>

        {/* Skipped / Unattempted */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Skipped</p>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              {((unattempted_count / (totalQuestions || 1)) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-900">{unattempted_count}</span>
            <span className="text-xs text-slate-400 font-semibold">/ {totalQuestions}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Left unattempted</p>
        </div>

        {/* Accuracy */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Accuracy</p>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              {accuracy_percentage.toFixed(0)}%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[#1F2227]">{accuracy_percentage.toFixed(1)}%</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-bold">
            {attempt.correct_count} correct &bull; {attempt.incorrect_count} wrong
          </p>
        </div>

        {/* Percentage Score */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Marks %</p>
            <span className="text-xs font-bold text-[#2E3AE3] bg-[#EEF2FF] px-2 py-0.5 rounded-md">
              Score
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-[#1F2227]">
              {((attempt.score / (attempt.max_score || 1)) * 100).toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {attempt.score.toFixed(2)} out of {attempt.max_score.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 4 Subjects Performance Breakdown */}
      {subject_results && subject_results.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1F2227]">
                Subject-Wise Performance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown across Mathematics, Physics, Chemistry, and Aptitude
              </p>
            </div>
            <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#2E3AE3] border border-[#2E3AE3]/20">
              4 Subjects
            </span>
          </div>

          {/* Mobile Subject Cards (< md) */}
          <div className="md:hidden space-y-3">
            {subject_results.map((sub, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#1F2227]">{sub.subject_name}</h3>
                    <p className="text-[11px] text-slate-500">{sub.total_questions} Questions</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#2E3AE3]">{sub.score.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">/ {sub.max_score.toFixed(2)} marks</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                  <div className="bg-blue-50/60 rounded-xl p-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Att.</span>
                    <span className="font-black text-blue-900">{sub.attempted_count}</span>
                  </div>
                  <div className="bg-amber-50/60 rounded-xl p-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Skip</span>
                    <span className="font-black text-amber-900">{sub.unattempted_count}</span>
                  </div>
                  <div className="bg-emerald-50/60 rounded-xl p-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Correct</span>
                    <span className="font-black text-emerald-800">{sub.correct_count}</span>
                  </div>
                  <div className="bg-rose-50/60 rounded-xl p-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Wrong</span>
                    <span className="font-black text-rose-700">{sub.incorrect_count}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Accuracy</span>
                    <span className="text-[#2E3AE3] font-black">{sub.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#2E3AE3]"
                      style={{ width: `${Math.min(100, Math.max(0, sub.accuracy))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-4 py-3.5 text-center">Questions</th>
                  <th className="px-4 py-3.5 text-center text-[#2E3AE3]">Attempted</th>
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
                    <td className="px-5 py-3.5 font-bold text-[#1F2227] whitespace-nowrap">
                      {sub.subject_name}
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                      {sub.total_questions}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-[#2E3AE3] bg-blue-50/40">
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
                    <td className="px-5 py-3.5 text-right font-extrabold text-[#1F2227] whitespace-nowrap">
                      {sub.score.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/ {sub.max_score.toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#2E3AE3]">
                      {sub.accuracy.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section Results (if multiple sections exist) */}
      {section_results && section_results.length > 1 && (
        <section className="mt-8">
          <h2 className="text-base font-bold text-[#1F2227]">Official Exam Sections</h2>
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
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <Link
          href="/dashboard"
          prefetch={true}
          className="text-xs font-bold uppercase text-slate-600 hover:text-slate-900"
        >
          Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/tests"
            prefetch={true}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all"
          >
            Take Another Mock Test
          </Link>
          <Link
            href={`/attempts/${attempt.id}/review`}
            prefetch={true}
            className="rounded-xl bg-[#2E3AE3] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#2E3AE3]/25 hover:bg-[#252fb8] active:scale-95 transition-all"
          >
            Review Solutions
          </Link>
        </div>
      </div>
    </main>
  );
}
