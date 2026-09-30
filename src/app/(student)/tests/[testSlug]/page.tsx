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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <Link href="/tests" className="hover:text-blue-700">Mock Tests</Link>
        <span>/</span>
        <span className="text-blue-700">{test.name}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                {test.exam?.name || "ENTRANCE MOCK"}
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                {test.test_type}
              </span>
              <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Timed CBT
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {test.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{test.description}</p>
          </div>
        </div>

        {/* 4 Subjects Covered */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Subjects Covered in this Mock Exam:
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-900">
              📐 Mathematics
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-900">
              ⚡ Physics
            </span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-900">
              🧪 Chemistry
            </span>
            <span className="rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-1.5 text-xs font-bold text-purple-900">
              🧠 Aptitude & Reasoning
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Timer Duration</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{durationMinutes} mins</p>
          <p className="mt-1 text-xs text-slate-500">Auto-submits on timer completion ({durationHours} hours)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Questions</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{test.total_questions}</p>
          <p className="mt-1 text-xs text-slate-500">Curated with detailed explanations</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Max Score</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{test.total_marks}</p>
          <p className="mt-1 text-xs text-slate-500">Negative marking applied</p>
        </div>
      </div>

      {/* Section Structure */}
      {test.sections && test.sections.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">Section Timing & Marking Structure</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-700">
                <tr>
                  <th className="px-6 py-3">Section</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Marking Scheme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {test.sections.map((ts) => (
                  <tr key={ts.id}>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {ts.section.name}
                    </td>
                    <td className="px-6 py-4">
                      {Math.round((ts.duration_seconds || ts.section.default_duration_seconds) / 60)} minutes
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      +{ts.marks_per_question ?? 1.0} for correct &bull; -{ts.negative_marks ?? 0.25} for incorrect
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Instructions */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Official Exam Instructions</h2>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-xs sm:text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">Please read carefully before beginning:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>The test begins as soon as you click the Start button below.</li>
            <li>A real-time countdown timer will remain visible at the top throughout your attempt.</li>
            <li><strong>Automatic Submission:</strong> If the countdown reaches 00:00:00, the exam will automatically save your answers and submit.</li>
            <li>You can navigate freely between the 4 subjects: Mathematics, Physics, Chemistry, and Aptitude.</li>
            <li>Use <strong>Mark for Review</strong> to flag questions you wish to revisit.</li>
            <li>After submitting, you will receive a comprehensive scorecard detailing <strong>Attempted vs Not Attempted</strong> questions, followed by step-by-step solutions and explanations.</li>
          </ul>
        </div>
      </section>

      {/* Start / Resume Practice Attempt action */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <Link
          href="/tests"
          className="text-xs font-bold uppercase text-slate-600 hover:text-slate-900"
        >
          &larr; Back to Tests Directory
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
