import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedUserAndRole } from "@/lib/auth/session";
import { getPublishedTests, getLearningProgress } from "@/lib/content/queries";
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
  const { user } = await getCachedUserAndRole();

  if (!user) {
    redirect("/login");
  }

  const [rawTests, attempts, learningProgress, profile] = await Promise.all([
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
  const latestAttempt = completedAttempts[0];

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-4 sm:py-6 font-sans space-y-5">
      {/* 1. Mobile Greeting Bar - Elevated Card with Clean Alignment */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E3AE3] to-[#1D2696] text-white text-2xl shadow-md shadow-[#2E3AE3]/20 shrink-0">
          {profile?.avatar_url && profile.avatar_url.length < 5 ? profile.avatar_url : "👨‍🎓"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-[#1F2227] tracking-tight">
              Hey, {displayName} 👋
            </h1>
            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-black text-[#2E3AE3] border border-[#2E3AE3]/20 shrink-0">
              {academicYear}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            IIITH Entrance Prep
          </p>
        </div>
      </div>

      {/* 2. Active Test Alert (Urgent State) */}
      {activeAttempt && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/90 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-200 text-amber-900 text-xl shrink-0 shadow-xs">
              ⏱️
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                Live Exam In Progress
              </p>
              <h3 className="text-sm font-bold text-slate-900">
                {activeAttempt.test?.name || "Entrance Mock Exam"}
              </h3>
            </div>
          </div>

          <Link
            href={`/attempts/${activeAttempt.id}`}
            prefetch={true}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-amber-600/30 hover:bg-amber-700 active:scale-95 transition-all text-center w-full sm:w-auto shrink-0"
          >
            Resume Exam &rarr;
          </Link>
        </div>
      )}

      {/* 3. Profile Completion Alert (Compact Warning) */}
      {!isProfileComplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg shrink-0">🔒</span>
            <p className="text-xs text-amber-900 font-semibold truncate">
              Complete your profile to unlock timed mock tests
            </p>
          </div>

          <Link
            href="/profile?notice=profile_required&returnTo=/dashboard"
            prefetch={true}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-black text-white shadow-xs shrink-0 active:scale-95 transition-all"
          >
            Complete &rarr;
          </Link>
        </div>
      )}

      {/* 4. Prostuti Progress Hero Card */}
      <div className="rounded-3xl bg-[#1F2227] text-white p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 h-48 w-48 rounded-full bg-[#2E3AE3]/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2E3AE3]/30 border border-[#2E3AE3]/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#A7B2CE]">
              <span>🎯</span>
              <span>Preparation &bull; Progress &bull; Practice</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              Free CBT Plan Active
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              Turn Practice Into Confident Rank.
            </h2>
            <p className="mt-1 text-xs text-slate-300 font-normal leading-relaxed">
              Authentic computer-based simulations for UGEE and SPEC with verified step-by-step explanations.
            </p>
          </div>

          {/* 4-Item Quick Stats Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center sm:text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#A7B2CE] block">
                Completed
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {completedAttempts.length}
              </p>
              <span className="text-[10px] text-emerald-400 font-medium">Tests taken</span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center sm:text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#A7B2CE] block">
                Accuracy
              </span>
              <p className="text-xl font-black text-[#6E89CE] mt-0.5">
                {accuracyPercentage}%
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{totalCorrectQuestions} correct</span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center sm:text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#A7B2CE] block">
                Curriculum
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {learningProgress.percentage}%
              </p>
              <span className="text-[10px] text-[#A7B2CE] font-medium">
                {learningProgress.completedTopics}/{learningProgress.totalTopics} topics
              </span>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center sm:text-left">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#A7B2CE] block">
                Question Bank
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {totalQuestionsCount}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">Verified Qs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Featured Live Timed Mock Test Card */}
      {latestTest && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#1F2227] tracking-tight">
              Featured CBT Mock Test
            </h3>
            <Link
              href="/tests"
              prefetch={true}
              className="text-xs font-black text-[#2E3AE3] hover:underline"
            >
              All Tests &rarr;
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
                  {latestTest.exam?.name || "ENTRANCE MOCK"}
                </span>
                <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live CBT
                </span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {Math.round(latestTest.duration_seconds / 60)} Mins &bull; {latestTest.total_questions || 40} Questions
              </span>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {latestTest.name}
              </h4>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                {latestTest.description || "Complete timed simulation covering Mathematics, Physics, Chemistry, and Aptitude."}
              </p>
            </div>

            {/* 4 Core Subjects Pill Tags */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="rounded-lg border border-blue-200 bg-blue-50/70 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                📐 Maths
              </span>
              <span className="rounded-lg border border-amber-200 bg-amber-50/70 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                ⚡ Physics
              </span>
              <span className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                🧪 Chemistry
              </span>
              <span className="rounded-lg border border-purple-200 bg-purple-50/70 px-2 py-0.5 text-[11px] font-bold text-purple-900">
                🧠 Reasoning
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Link
                href={`/tests/${latestTest.slug}`}
                prefetch={true}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-all text-center"
              >
                View Instructions &rarr;
              </Link>

              <StartAttemptButton
                testId={latestTest.id}
                isProfileComplete={isProfileComplete}
                returnUrl="/dashboard"
                size="md"
              />
            </div>
          </div>
        </section>
      )}

      {/* 6. Learning Progress Section - Replaces Core Exam Subjects */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-[#1F2227] tracking-tight">
            Learning Progress
          </h3>
          <Link
            href="/learning"
            prefetch={true}
            className="text-xs font-black text-[#2E3AE3] hover:underline"
          >
            Explore Syllabus &rarr;
          </Link>
        </div>

        <Link
          href="/learning"
          prefetch={true}
          className="block rounded-3xl border border-blue-100/90 bg-[#F4F7FF] p-4 sm:p-5 shadow-xs hover:border-[#2E3AE3]/40 active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#2E3AE3] block">
                Learning Progress
              </span>
              <p className="mt-1 text-base sm:text-lg font-bold text-slate-900">
                {learningProgress.completedTopics} of {learningProgress.totalTopics} topics completed
              </p>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-[#2E3AE3]">
              {learningProgress.percentage}%
            </span>
          </div>

          <div className="mt-3.5 h-3 overflow-hidden rounded-full bg-slate-200/80">
            <div
              className="h-full rounded-full bg-[#2E3AE3] transition-all duration-500"
              style={{ width: `${learningProgress.percentage}%` }}
            />
          </div>
        </Link>
      </section>

      {/* 7. Recent Result Card (if any) */}
      {latestAttempt && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#1F2227] tracking-tight">
              Latest Scorecard
            </h3>
            <Link
              href="/attempts"
              prefetch={true}
              className="text-xs font-black text-[#2E3AE3] hover:underline"
            >
              History &rarr;
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {latestAttempt.test?.name || "Mock Test"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-black text-[#2E3AE3]">
                  Score: {latestAttempt.score ?? 0} Marks
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[11px] font-semibold text-emerald-600">
                  {latestAttempt.correct_count ?? 0} Correct
                </span>
              </div>
            </div>

            <Link
              href={`/attempts/${latestAttempt.id}/result`}
              prefetch={true}
              className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all shrink-0 active:scale-95"
            >
              Review &rarr;
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
