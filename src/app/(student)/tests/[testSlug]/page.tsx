import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestBySlug } from "@/lib/content/queries";
import { getActiveAttemptForTest } from "@/lib/attempts/queries";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { StartAttemptButton } from "@/components/attempts/start-attempt-button";
import { SubscribeForMocksButton } from "@/components/payments/subscribe-for-mocks-button";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ testSlug: string }>;
}

export default async function TestDetailPage({ params }: PageProps) {
  const { testSlug } = await params;
  const user = await getCachedAuthUser();
  const [test, profile] = await Promise.all([
    getTestBySlug(testSlug),
    user ? getStudentProfile(user.id) : null,
  ]);

  if (!test) {
    notFound();
  }

  const isProfileComplete = profile?.is_completed ?? false;
  const activeAttempt = await getActiveAttemptForTest(test.id);
  const supabase = await createClient();
  const { data: activeSubscription } = user
    ? await supabase
        .from("mock_test_subscriptions")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const canStartTest = Boolean(activeAttempt) || test.test_type !== "mock" || Boolean(test.is_free) || Boolean(activeSubscription);

  const durationMinutes = Math.round(test.duration_seconds / 60);
  const durationHours = (durationMinutes / 60).toFixed(1);

  return (
    <main className="mx-auto max-w-4xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 font-sans space-y-6">
      {/* 1-Step Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/tests"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 px-3 py-2 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to Mock Tests list"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Back to Tests</span>
        </Link>

        <span className="text-xs font-bold text-slate-400">
          {test.exam?.name || "IIITH Prep"}
        </span>
      </div>

      {/* Main Test Header Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
            {test.exam?.name || "ENTRANCE MOCK"}
          </span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
            {test.test_type}
          </span>
          <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase border ${test.test_type !== "mock" || test.is_free ? "bg-emerald-50 text-emerald-800 border-emerald-200" : activeSubscription ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
            {test.test_type !== "mock" || test.is_free ? "Free for all students" : activeSubscription ? "Subscription active" : "Subscription required"}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F2227]">
            {test.name}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-2xl">
            {test.description}
          </p>
        </div>

        {/* 4 Subjects Covered Pill Bar */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Subjects Covered in this Simulation:
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-900">
              📐 Mathematics
            </span>
            <span className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-bold text-amber-900">
              ⚡ Physics
            </span>
            <span className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-900">
              🧪 Chemistry
            </span>
            <span className="rounded-xl border border-purple-200 bg-purple-50/70 px-3 py-1.5 text-xs font-bold text-purple-900">
              🧠 Aptitude & Reasoning
            </span>
          </div>
        </div>
      </div>

      {/* 3 Overview Metrics Cards */}
      <div className="grid gap-3.5 grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Duration</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{durationMinutes}m</p>
          <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5">Auto-submit ({durationHours} hrs)</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Questions</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{test.total_questions}</p>
          <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5">Verified explanations</p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Marks</p>
          <p className="mt-1 text-xl sm:text-2xl font-black text-[#2E3AE3]">{test.total_marks}</p>
          <p className="text-[10px] text-slate-500 hidden sm:block mt-0.5">Negative marking</p>
        </div>
      </div>

      {/* Section Structure (Mobile-Friendly Table) */}
      {test.sections && test.sections.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-[#1F2227]">
            Section Timing & Marking Scheme
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <div className="divide-y divide-slate-100">
              {test.sections.map((ts) => (
                <div key={ts.id} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-black text-sm sm:text-base text-slate-900 block">
                      {ts.section.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Duration: {Math.round((ts.duration_seconds || ts.section.default_duration_seconds) / 60)} minutes
                    </span>
                  </div>
                  <span className="rounded-xl bg-[#EEF2FF] text-[#2E3AE3] border border-[#2E3AE3]/20 px-3 py-1 text-xs font-bold">
                    +{ts.marks_per_question ?? 1.0} &bull; -{ts.negative_marks ?? 0.25}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Official Exam Instructions */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-[#1F2227]">
          Official Examination Instructions
        </h2>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs text-xs sm:text-sm text-slate-700 space-y-2.5">
          <p className="font-bold text-slate-900">Please review the CBT test-taking guidelines:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
            <li>The test timer starts the moment you click <strong>Start Mock Exam</strong>.</li>
            <li>A real-time countdown timer remains visible at the top throughout your attempt.</li>
            <li><strong>Automatic Submission:</strong> If the countdown reaches 00:00:00, the exam will automatically save your answers and submit.</li>
            <li>You can navigate freely across all 4 subjects (Maths, Physics, Chem, Aptitude).</li>
            <li>Use <strong>Mark for Review</strong> to flag questions you want to double-check before submission.</li>
            <li>Your scorecard will show <strong>Attempted vs Unattempted</strong> counts, overall accuracy, and verified step-by-step solutions.</li>
          </ul>
        </div>
      </section>

      {/* Profile Incomplete Warning Banner */}
      {!isProfileComplete && !activeAttempt && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200 text-xl shrink-0">
              🔒
            </span>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Exam Locked — Student Profile Required
              </h3>
              <p className="mt-0.5 text-xs text-amber-800 leading-relaxed font-medium">
                Please complete your student profile (Full Name, Mobile Number, DOB, Gender, Location, and Academic Year P1/P2) to enable this computer-based mock test.
              </p>
            </div>
          </div>
          <Link
            href={`/profile?notice=profile_required&returnTo=/tests/${testSlug}`}
            className="rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs active:scale-95 text-center"
          >
            Complete Profile &rarr;
          </Link>
        </div>
      )}

      {/* Start / Resume Action Bottom Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Link
          href="/tests"
          className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 text-center sm:text-left"
        >
          &larr; Tests Directory
        </Link>

        <div className="flex items-center justify-center">
          {canStartTest ? (
            <StartAttemptButton
              testId={test.id}
              hasActiveAttempt={Boolean(activeAttempt)}
              activeAttemptId={activeAttempt?.id}
              isProfileComplete={isProfileComplete}
              returnUrl={`/tests/${testSlug}`}
              size="lg"
            />
          ) : (
            <SubscribeForMocksButton />
          )}
        </div>
      </div>
    </main>
  );
}
