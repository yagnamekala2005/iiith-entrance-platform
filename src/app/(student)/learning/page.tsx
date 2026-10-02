import Link from "next/link";
import { getPublishedExams, getSubjectsWithHierarchy } from "@/lib/content/queries";

export const dynamic = "force-dynamic";

export default async function MyLearningPage() {
  const [exams, subjects] = await Promise.all([
    getPublishedExams(),
    getSubjectsWithHierarchy(),
  ]);

  const subjectMeta: Record<string, { icon: string; badgeClass: string; borderClass: string }> = {
    mathematics: { icon: "📐", badgeClass: "bg-blue-50 text-blue-800 border-blue-200", borderClass: "border-blue-200" },
    physics: { icon: "⚡", badgeClass: "bg-amber-50 text-amber-800 border-amber-200", borderClass: "border-amber-200" },
    chemistry: { icon: "🧪", badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200", borderClass: "border-emerald-200" },
    "aptitude-reasoning": { icon: "🧠", badgeClass: "bg-purple-50 text-purple-800 border-purple-200", borderClass: "border-purple-200" },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/dashboard" prefetch={true} className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <span className="text-blue-700">My Learning</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              📖 IIITH Entrance Learning Curriculum
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              My Learning: Subjects, Chapters & Subtopics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Master the official curriculum configured by administrators across Mathematics, Physics, Chemistry, and Aptitude for UGEE & SPEC examinations.
            </p>
          </div>
          <Link
            href="/tests"
            prefetch={true}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
          >
            Take Timed Mock Test &rarr;
          </Link>
        </div>
      </div>

      {/* 4 Core Subjects with Admin-Curated Chapters & Subtopics */}
      <div className="mt-8 space-y-8">
        {subjects.map((subject) => {
          const meta = subjectMeta[subject.slug] || {
            icon: "📚",
            badgeClass: "bg-slate-50 text-slate-800 border-slate-200",
            borderClass: "border-slate-200",
          };

          return (
            <div
              key={subject.id}
              className={`rounded-2xl border ${meta.borderClass} bg-white p-5 sm:p-7 shadow-xs transition-all`}
            >
              {/* Subject Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-xs">
                    {meta.icon}
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">{subject.name}</h2>
                    <span className="text-xs text-slate-500 font-medium">
                      {subject.chapters.length} Chapters &bull; {subject.chapters.reduce((acc, c) => acc + (c.topics?.length || 0), 0)} Subtopics
                    </span>
                  </div>
                </div>

                <span className={`rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                  Core Discipline
                </span>
              </div>

              {/* Chapters & Subtopics Grid */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subject.chapters.length === 0 ? (
                  <p className="text-xs text-slate-400 italic col-span-full">No chapters configured yet.</p>
                ) : (
                  subject.chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-xs"
                    >
                      <div>
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                          Chapter
                        </span>
                        <h3 className="mt-2 text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {chapter.name}
                        </h3>

                        {/* Subtopics List */}
                        <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Subtopics ({chapter.topics.length}):
                          </p>
                          {chapter.topics.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No subtopics added yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {chapter.topics.map((t) => (
                                <span
                                  key={t.id}
                                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 font-medium"
                                >
                                  &bull; {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

