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
    <main className="mx-auto max-w-5xl px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 font-sans space-y-4 sm:space-y-6">
      {/* App Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Mock Tests
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Timed CBT entrance simulations
          </p>
        </div>

        <Link
          href="/attempts"
          prefetch={true}
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
        >
          <span>📊</span>
          <span>Scorecards</span>
        </Link>
      </div>

      {/* Filter Tabs - Horizontal Swipe Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <Link
          href="/tests"
          prefetch={true}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs ${
            !examFilter
              ? "bg-[#2E3AE3] text-white shadow-[#2E3AE3]/25"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All ({tests.length})
        </Link>
        {exams.map((exam) => {
          const isSelected = examFilter === exam.slug;
          return (
            <Link
              key={exam.id}
              href={`/tests?exam=${exam.slug}`}
              prefetch={true}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-2xs ${
                isSelected
                  ? "bg-[#2E3AE3] text-white shadow-[#2E3AE3]/25"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {exam.name}
            </Link>
          );
        })}
      </div>

      {/* Profile Incomplete Notification Banner */}
      {!isProfileComplete && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-200 text-lg shrink-0">
              🔒
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                Complete Profile to Unlock Tests
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Update name, mobile, and academic details to start taking tests.
              </p>
            </div>
          </div>
          <Link
            href="/profile?notice=profile_required&returnTo=/tests"
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shrink-0 shadow-xs text-center w-full sm:w-auto"
          >
            Complete Profile
          </Link>
        </div>
      )}

      {/* Tests Grid */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        {tests.length === 0 ? (
          <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-xs">
            <span className="text-3xl">📚</span>
            <h3 className="mt-2 text-base font-bold text-slate-900">No mock tests found</h3>
            <p className="mt-1 text-xs text-slate-500">No mock tests currently match the selected exam.</p>
            <Link
              href="/tests"
              className="mt-3.5 inline-block rounded-xl bg-[#2E3AE3] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#222CB8]"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          tests.map((test) => {
            const durationMinutes = Math.round(test.duration_seconds / 60);
            const isGenericDesc =
              !test.description ||
              test.description.trim() === "Official CBT mock examination for IIITH entrance." ||
              test.description.trim() === "";

            return (
              <div
                key={test.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3.5"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/15">
                        {test.exam?.name || "Competitive Exam"}
                      </span>
                      {test.is_free && (
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          Free
                        </span>
                      )}
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live CBT
                    </span>
                  </div>

                  {/* Test Name & Description */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {test.name}
                    </h3>
                    {!isGenericDesc && (
                      <p className="mt-1 text-xs text-slate-500 font-normal line-clamp-2">
                        {test.description}
                      </p>
                    )}
                  </div>

                  {/* Section breakdown pills */}
                  {test.sections && test.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {test.sections.map((ts) => (
                        <span
                          key={ts.id}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 font-medium"
                        >
                          {ts.section.name} &bull; {Math.round((ts.duration_seconds || 0) / 60)}m
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Meta Chips */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <span>📝</span>
                      <span>{test.total_questions} {test.total_questions === 1 ? "Question" : "Questions"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <span>⏱️</span>
                      <span>{durationMinutes} Mins</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Buttons: Clean 50/50 Equal Height Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                  <Link
                    href={`/tests/${test.slug}`}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center transition-all active:scale-95 text-center"
                  >
                    Instructions
                  </Link>

                  {test.test_type !== "mock" || test.is_free || hasSubscription ? (
                    <StartAttemptButton
                      testId={test.id}
                      isProfileComplete={isProfileComplete}
                      returnUrl="/tests"
                      label="Start Mock"
                      className="h-11 w-full text-xs font-bold rounded-xl"
                    />
                  ) : (
                    <SubscribeForMocksButton compact className="w-full h-11" label="Unlock Mock" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
