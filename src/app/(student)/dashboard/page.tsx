import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getPublishedExams, getPublishedTests, getPublishedQuestions, getLearningProgress } from "@/lib/content/queries";
import { getUserAttempts } from "@/lib/attempts/queries";
import { DashboardQuestionTabs } from "@/components/dashboard/dashboard-question-tabs";
import { StartAttemptButton } from "@/components/attempts/start-attempt-button";

export const dynamic = "force-dynamic";

const OLD_TEST_IDS = new Set([
  "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
  "64a2c6a7-77eb-426e-bc3f-c492865aac77",
  "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
]);

export default async function DashboardPage() {
  const user = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  const [exams, rawTests, questions, attempts] = await Promise.all([
    getPublishedExams(),
    getPublishedTests(),
    getPublishedQuestions({ limit: 20 }),
    getUserAttempts(user.id),
    getLearningProgress(user.id),
  ]);

  const tests = rawTests.filter((t) => !OLD_TEST_IDS.has(t.id));
  // getPublishedTests() orders tests by created_at ascending, so the last test is the latest.
  const latestTest = tests[tests.length - 1];

  const activeAttempt = attempts.find((a) => a.status === "in_progress");
  const completedAttempts = attempts.filter((a) => a.status === "submitted");

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">


      {/* Ongoing Test Alert Banner */}
      {activeAttempt && (
        <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200 text-xl shrink-0">
              ⏱️
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                Mock Test In Progress
              </p>
              <h3 className="text-base font-bold text-slate-900">
                {activeAttempt.test?.name || "Active Entrance Mock Exam"}
              </h3>
              <p className="text-xs text-amber-800">
                You have an active timed attempt. The server-synchronized timer is running.
              </p>
            </div>
          </div>

          <Link
            href={`/attempts/${activeAttempt.id}`}
            prefetch={true}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95"
          >
            Resume Live Exam &rarr;
          </Link>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                Student Preparation Center
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">{user.email}</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              IIITH UGEE & SPEC Mock Test Platform
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Complete computer-based test (CBT) environment featuring real-time synchronized timers, 4 core subjects (Maths, Physics, Chemistry, Aptitude), auto-submission on expiration, and post-exam scorecards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tests"
              prefetch={true}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
            >
              All Mock Tests
            </Link>
            <Link
              href="/attempts"
              prefetch={true}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all"
            >
              My Scorecards ({completedAttempts.length})
            </Link>
          </div>
        </div>

        {/* Quick Platform Metrics */}
        <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-slate-100 pt-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Target Programs</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{exams.length || 2} Exams</p>
            <p className="text-xs text-slate-500">UGEE & SPEC</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Core Subjects</p>
            <p className="mt-1 text-2xl font-black text-blue-700">4 Subjects</p>
            <p className="text-xs text-slate-500">Maths, Physics, Chem, Aptitude</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Question Bank</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{questions.length} Questions</p>
            <p className="text-xs text-slate-500">With verified explanations</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Tests</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{completedAttempts.length}</p>
            <p className="text-xs text-slate-500">Track accuracy & score</p>
          </div>
        </div>
      </div>

      {/* Featured Real-Time Mock Tests Launchers */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Available Real-Time Mock Tests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Timed simulations covering Mathematics, Physics, Chemistry, and Aptitude.
            </p>
          </div>
          <Link href="/tests" className="text-xs font-bold text-blue-700 hover:text-blue-900">
            View All Tests &rarr;
          </Link>
        </div>

        {tests.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <span className="text-3xl">📝</span>
            <h3 className="mt-2 text-base font-bold text-slate-800">No Mock Tests Available Yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              No active mock tests are published right now. Once an administrator authors and publishes a mock test, it will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {[latestTest].map((test) => {
              const durationMinutes = Math.round(test.duration_seconds / 60);
              return (
                <div
                  key={test.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                        {test.exam?.slug.toUpperCase() || "ENTRANCE MOCK"} &bull; {test.test_type.toUpperCase()}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        Live Timed CBT
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-bold text-slate-900">{test.name}</h3>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                      {test.description}
                    </p>

                    {/* 4 Subjects Pills */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded-lg border border-blue-200 bg-blue-50/60 px-2.5 py-1 text-[11px] font-bold text-blue-900">
                        📐 Mathematics
                      </span>
                      <span className="rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        ⚡ Physics
                      </span>
                      <span className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                        🧪 Chemistry
                      </span>
                      <span className="rounded-lg border border-purple-200 bg-purple-50/60 px-2.5 py-1 text-[11px] font-bold text-purple-900">
                        🧠 Aptitude
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-900">{test.total_questions || 40} Questions</span>
                      <span> &bull; </span>
                      <span className="font-bold text-slate-900">{durationMinutes} Minutes</span>
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
            })}
          </div>
        )}
      </section>

      {/* My Learning Progress */}
      <section className="mt-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                  My Learning
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500 font-medium">Chapter completion</span>
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Your Learning Progress</h2>
              <p className="mt-1 text-xs text-slate-500">
                {learningProgress.completedChapters} of {learningProgress.totalChapters} chapters completed
              </p>
            </div>
            <Link
              href="/learning"
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
            >
              Continue Learning &rarr;
            </Link>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <span className="text-3xl font-black text-blue-700">{learningProgress.percentage}%</span>
              <span className="text-xs font-semibold text-slate-500">
                {learningProgress.completedChapters}/{learningProgress.totalChapters} Chapters
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-700 transition-all duration-500"
                style={{ width: `${learningProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 4-Subject Questions Showcase */}
      <section className="mt-10">
        <DashboardQuestionTabs questions={questions} />
      </section>

      {/* Target Entrance Programs Breakdown */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900">Target Entrance Programs</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {exams.map((exam) => (
            <div key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                  {exam.slug.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Negative marking: {(Number(exam.negative_marking_ratio || 0.25) * 100).toFixed(0)}%
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{exam.name}</h3>
              <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600">{exam.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold">
                <Link href={`/practice/${exam.slug}`} className="text-blue-700 hover:text-blue-900">
                  Browse Sections &rarr;
                </Link>
                <Link href={`/tests?exam=${exam.slug}`} className="text-slate-500 hover:text-slate-700">
                  View Mocks
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
