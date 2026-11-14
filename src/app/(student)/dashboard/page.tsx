import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getPublishedExams, getPublishedTests, getLearningProgress } from "@/lib/content/queries";
import { getUserAttempts } from "@/lib/attempts/queries";
import { getStudentProfile } from "@/lib/profile/queries";
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

  const [exams, rawTests, attempts, learningProgress, profile] = await Promise.all([
    getPublishedExams(),
    getPublishedTests(),
    getUserAttempts(user.id),
    getLearningProgress(user.id),
    getStudentProfile(user.id),
  ]);

  const isProfileComplete = profile?.is_completed ?? false;

  const tests = rawTests.filter((t) => !OLD_TEST_IDS.has(t.id));
  const totalQuestionsCount = tests.reduce((acc, t) => acc + (t.total_questions || 0), 0) || 40;
  const latestTest = tests[tests.length - 1];

  const activeAttempt = attempts.find((a) => a.status === "in_progress");
  const completedAttempts = attempts.filter((a) => a.status === "submitted");

  // Calculate overall performance stats
  const totalAttemptedQuestions = completedAttempts.reduce(
    (acc, a) => acc + (a.total_questions - (a.unanswered_count || 0)),
    0
  );
  const totalCorrectQuestions = completedAttempts.reduce(
    (acc, a) => acc + (a.correct_count || 0),
    0
  );
  const accuracyPercentage =
    totalAttemptedQuestions > 0
      ? Math.round((totalCorrectQuestions / totalAttemptedQuestions) * 100)
      : 0;

  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Aspirant";
  const academicYear = profile?.academic_year || "P1 / P2";

  return (
    <main className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 font-sans space-y-6">
      {/* 1. Student Greeting & Readiness Pill (Prostuti Header Style) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E3AE3] to-[#4F46E5] text-white text-2xl sm:text-3xl shadow-md shadow-[#2E3AE3]/20 shrink-0">
            {profile?.avatar_url && profile.avatar_url.length < 5 ? profile.avatar_url : "👨‍🎓"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#1F2227] tracking-tight">
                Welcome, {displayName}!
              </h1>
              <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-black text-[#2E3AE3] border border-[#2E3AE3]/20">
                {academicYear}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              IIITH UGEE (SUPR & REAP) &bull; SPEC Computer-Based Prep
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            <span>👤 Profile</span>
            {isProfileComplete ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </Link>
          <Link
            href="/tests"
            className="rounded-xl bg-[#2E3AE3] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-[#2E3AE3]/25 hover:bg-[#222CB8] transition-colors"
          >
            Take Test &rarr;
          </Link>
        </div>
      </div>

      {/* 2. Ongoing Test Alert (Urgent State) */}
      {activeAttempt && (
        <div className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-amber-900 text-2xl shrink-0 shadow-xs">
              ⏱️
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                Active Mock Exam In Progress
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {activeAttempt.test?.name || "Live Entrance Mock Exam"}
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                Your timed CBT session is active. Live timer synchronized with the test server.
              </p>
            </div>
          </div>

          <Link
            href={`/attempts/${activeAttempt.id}`}
            prefetch={true}
            className="rounded-2xl bg-amber-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-amber-600/30 hover:bg-amber-700 active:scale-95 transition-all text-center shrink-0 w-full sm:w-auto"
          >
            Resume Live Exam &rarr;
          </Link>
        </div>
      )}

      {/* 3. Profile Completion Alert (Required for Tests) */}
      {!isProfileComplete && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200 text-xl shrink-0">
              🔒
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                Action Required &bull; CBT Mock Tests Locked
              </p>
              <h3 className="text-base font-bold text-slate-900">
                Complete your Student Profile
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Enter your Full Name, Mobile Number, DOB, Gender, Location, and Academic Year (P1 or P2) to unlock timed mock exams.
              </p>
            </div>
          </div>

          <Link
            href="/profile?notice=profile_required&returnTo=/dashboard"
            prefetch={true}
            className="rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-amber-600/25 hover:bg-amber-700 transition-all active:scale-95 shrink-0 w-full sm:w-auto text-center"
          >
            Complete Profile &rarr;
          </Link>
        </div>
      )}

      {/* 4. Prostuti Progress Hero Card */}
      <div className="rounded-3xl bg-[#1F2227] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[#2E3AE3]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2E3AE3]/30 border border-[#2E3AE3]/40 px-3 py-1 text-[11px] font-bold text-[#A7B2CE]">
              <span>🎯</span>
              <span>Preparation &bull; Progress &bull; Practice</span>
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Turn Daily Practice Into Confident Rank.
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xl">
              Authentic computer-based simulations covering Mathematics, Physics, Chemistry, and Aptitude. Practice with live countdown timers and review step-by-step verified explanations.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/tests"
                className="rounded-2xl bg-[#2E3AE3] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-[#2E3AE3]/35 hover:bg-[#222CB8] active:scale-95 transition-all"
              >
                Start Mock Test &rarr;
              </Link>
              <Link
                href="/learning"
                className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-95 transition-all"
              >
                Explore Syllabus
              </Link>
            </div>
          </div>

          {/* 4-Item Quick Stats Matrix */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 pt-4 lg:pt-0">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#A7B2CE]">
                Tests Completed
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                {completedAttempts.length}
              </p>
              <span className="text-[11px] text-emerald-400 font-medium">Verified scorecards</span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#A7B2CE]">
                Overall Accuracy
              </span>
              <p className="text-2xl sm:text-3xl font-black text-[#6E89CE] mt-1">
                {accuracyPercentage}%
              </p>
              <span className="text-[11px] text-slate-400 font-medium">{totalCorrectQuestions} correct answers</span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#A7B2CE]">
                Curriculum Progress
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                {learningProgress.percentage}%
              </p>
              <span className="text-[11px] text-[#A7B2CE] font-medium">
                {learningProgress.completedTopics}/{learningProgress.totalTopics} Topics
              </span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#A7B2CE]">
                Question Bank
              </span>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                {totalQuestionsCount}
              </p>
              <span className="text-[11px] text-slate-400 font-medium">With explanations</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Featured Live Timed Mock Test Card */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#1F2227] tracking-tight">
              Featured CBT Mock Test
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Realistic IIITH entrance test with server countdown and auto-submission.
            </p>
          </div>
          <Link
            href="/tests"
            className="text-xs font-black text-[#2E3AE3] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {latestTest ? (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs hover:border-slate-300 transition-all space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
                  {latestTest.exam?.name || "ENTRANCE MOCK"} &bull; {latestTest.test_type.toUpperCase()}
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live CBT
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {Math.round(latestTest.duration_seconds / 60)} Minutes &bull; {latestTest.total_questions || 40} Questions
              </span>
            </div>

            <div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {latestTest.name}
              </h4>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {latestTest.description ||
                  "Complete computer-based mock simulation covering Mathematics, Physics, Chemistry, and Aptitude & Reasoning."}
              </p>
            </div>

            {/* 4 Core Subjects Pill Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-900">
                📐 Maths
              </span>
              <span className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs font-bold text-amber-900">
                ⚡ Physics
              </span>
              <span className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-bold text-emerald-900">
                🧪 Chemistry
              </span>
              <span className="rounded-lg border border-purple-200 bg-purple-50/70 px-2.5 py-1 text-xs font-bold text-purple-900">
                🧠 Reasoning
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <Link
                href={`/tests/${latestTest.slug}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 transition-all text-center"
              >
                Instructions & Syllabus
              </Link>

              <StartAttemptButton
                testId={latestTest.id}
                isProfileComplete={isProfileComplete}
                returnUrl="/dashboard"
                size="md"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
            No live mock tests currently scheduled. Check back soon!
          </div>
        )}
      </section>

      {/* 6. Four Core Subjects Breakdown (Curriculum) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#1F2227] tracking-tight">
              Core Exam Subjects
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Targeted revision for UGEE (SUPR & REAP) and SPEC.
            </p>
          </div>
          <Link
            href="/learning"
            className="text-xs font-black text-[#2E3AE3] hover:underline"
          >
            All Curriculum &rarr;
          </Link>
        </div>

        <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4">
          {/* Subject 1: Mathematics */}
          <Link
            href="/learning"
            className="rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/80 to-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white text-xl shadow-md shadow-blue-600/25">
                📐
              </div>
              <h4 className="mt-3 text-base font-black text-slate-900">Mathematics</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Algebra, Calculus, Coordinate Geometry</p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100/80 flex items-center justify-between text-xs font-bold text-blue-700">
              <span>Explore &rarr;</span>
            </div>
          </Link>

          {/* Subject 2: Physics */}
          <Link
            href="/learning"
            className="rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white text-xl shadow-md shadow-amber-600/25">
                ⚡
              </div>
              <h4 className="mt-3 text-base font-black text-slate-900">Physics</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Mechanics, Electromagnetism, Optics</p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs font-bold text-amber-800">
              <span>Explore &rarr;</span>
            </div>
          </Link>

          {/* Subject 3: Chemistry */}
          <Link
            href="/learning"
            className="rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white text-xl shadow-md shadow-emerald-600/25">
                🧪
              </div>
              <h4 className="mt-3 text-base font-black text-slate-900">Chemistry</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Physical, Organic, Inorganic Chemistry</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100/80 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>Explore &rarr;</span>
            </div>
          </Link>

          {/* Subject 4: Aptitude & Reasoning */}
          <Link
            href="/learning"
            className="rounded-3xl border border-purple-200/80 bg-gradient-to-b from-purple-50/80 to-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white text-xl shadow-md shadow-purple-600/25">
                🧠
              </div>
              <h4 className="mt-3 text-base font-black text-slate-900">Aptitude</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">REAP Reasoning, Data Analysis</p>
            </div>
            <div className="mt-4 pt-3 border-t border-purple-100/80 flex items-center justify-between text-xs font-bold text-purple-800">
              <span>Explore &rarr;</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 7. Target Exam Programs (UGEE & SPEC) */}
      <section className="space-y-3">
        <h3 className="text-lg sm:text-xl font-black text-[#1F2227] tracking-tight">
          Target Entrance Programs
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
                    {exam.slug.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Negative marking: {(Number(exam.negative_marking_ratio || 0.25) * 100).toFixed(0)}%
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-black text-slate-900">{exam.name}</h4>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {exam.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <Link href={`/practice/${exam.slug}`} className="text-[#2E3AE3] hover:underline">
                  Browse Sections &rarr;
                </Link>
                <Link href={`/tests?exam=${exam.slug}`} className="text-slate-500 hover:text-slate-900">
                  View Mocks &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
