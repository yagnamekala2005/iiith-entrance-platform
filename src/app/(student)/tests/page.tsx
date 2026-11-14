import Link from "next/link";
import { getPublishedTests, getPublishedExams } from "@/lib/content/queries";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { StartAttemptButton } from "@/components/attempts/start-attempt-button";
import { SubscribeForMocksButton } from "@/components/payments/subscribe-for-mocks-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OLD_TEST_IDS = new Set([
  "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
  "64a2c6a7-77eb-426e-bc3f-c492865aac77",
  "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
]);

interface PageProps {
  searchParams: Promise<{ exam?: string }>;
}

export default async function TestsDirectoryPage({ searchParams }: PageProps) {
  const { exam: examFilter } = await searchParams;
  const user = await getCachedAuthUser();
  const profile = user ? await getStudentProfile(user.id) : null;
  const isProfileComplete = profile?.is_completed ?? false;

  const [rawTests, exams] = await Promise.all([
    getPublishedTests(examFilter),
    getPublishedExams(),
  ]);

  const tests = rawTests.filter((t) => !OLD_TEST_IDS.has(t.id));
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
  const hasSubscription = Boolean(activeSubscription);

  return (
    <main className="mx-auto max-w-7xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 font-sans space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
              <span>⏱️</span>
              <span>CBT Simulation Center</span>
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#1F2227]">
              Competitive Exam Mock Tests
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 font-normal max-w-2xl leading-relaxed">
              Timed computer-based mock exams for IIITH UGEE (SUPR & REAP) and SPEC with server countdown timers, auto-submission on expiration, and detailed scorecards.
            </p>
          </div>

          <Link
            href="/attempts"
            prefetch={true}
            className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
          >
            My Past Scorecards &rarr;
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <Link
            href="/tests"
            prefetch={true}
            className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
              !examFilter
                ? "bg-[#2E3AE3] text-white shadow-[#2E3AE3]/25"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            All Mock Tests ({tests.length})
          </Link>
          {exams.map((exam) => {
            const isSelected = examFilter === exam.slug;
            return (
              <Link
                key={exam.id}
                href={`/tests?exam=${exam.slug}`}
                prefetch={true}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                  isSelected
                    ? "bg-[#2E3AE3] text-white shadow-[#2E3AE3]/25"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {exam.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Profile Incomplete Notification Banner */}
      {!isProfileComplete && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-200 text-xl shrink-0">
              🔒
            </span>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Mock Tests Locked — Student Profile Required
              </h3>
              <p className="mt-0.5 text-xs text-amber-800 leading-relaxed max-w-2xl font-medium">
                To write competitive mock tests, generate official scorecards, and track your progress, you must complete your student profile details (Full Name, Mobile Number, DOB, Gender, Location, and Academic Year P1/P2).
              </p>
            </div>
          </div>
          <Link
            href="/profile?notice=profile_required&returnTo=/tests"
            className="rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs active:scale-95"
          >
            Complete Profile Now &rarr;
          </Link>
        </div>
      )}

      {/* Tests Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {tests.length === 0 ? (
          <div className="col-span-2 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <span className="text-4xl">📚</span>
            <h3 className="mt-3 text-lg font-bold text-slate-900">No mock tests found</h3>
            <p className="mt-1 text-xs text-slate-500">No mock tests currently match the selected competitive exam.</p>
            <Link
              href="/tests"
              className="mt-4 inline-block rounded-2xl bg-[#2E3AE3] px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md hover:bg-[#222CB8]"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          tests.map((test) => {
            const durationMinutes = Math.round(test.duration_seconds / 60);
            return (
              <div
                key={test.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
                      {test.exam?.name || "Competitive Exam"} &bull; {test.test_type.toUpperCase()}
                    </span>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Timed CBT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-[#1F2227] leading-snug">
                      {test.name}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal">
                      {test.description}
                    </p>
                  </div>

                  {/* Section breakdown pills */}
                  {test.sections && test.sections.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Exam Sections ({test.sections.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {test.sections.map((ts) => (
                          <span
                            key={ts.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 font-semibold"
                          >
                            {ts.section.name} &bull; {Math.round((ts.duration_seconds || 0) / 60)}m
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div className="text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{test.total_questions} Questions</span>
                      <span>&bull;</span>
                      <span className="font-extrabold text-slate-900 text-sm">{durationMinutes} Mins</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Auto-submit on expiry</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/tests/${test.slug}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all text-center"
                    >
                      Instructions
                    </Link>

                    {test.test_type !== "mock" || test.is_free || hasSubscription ? (
                      <StartAttemptButton
                        testId={test.id}
                        isProfileComplete={isProfileComplete}
                        returnUrl="/tests"
                      />
                    ) : (
                      <SubscribeForMocksButton compact />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
