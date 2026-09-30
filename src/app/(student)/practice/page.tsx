import Link from "next/link";
import { getPublishedExams, getSubjectsWithHierarchy } from "@/lib/content/queries";

export default async function PracticeDirectoryPage() {
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
        <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <span className="text-blue-700">Practice Syllabus</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              Curriculum & Question Bank
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Targeted Subject Practice
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Master the 4 core pillars of IIITH UGEE (SUPR & REAP) and SPEC examinations: Mathematics, Physics, Chemistry, and Aptitude & Reasoning.
            </p>
          </div>
          <Link
            href="/tests"
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
          >
            Take Full Mock Test &rarr;
          </Link>
        </div>
      </div>

      {/* Target Entrance Exams */}
      <section className="mt-8">
        <h2 className="text-xl font-extrabold text-slate-900">1. Target Entrance Program</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Official section structure, marking scheme, and time duration for each program.
        </p>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                  {exam.slug.toUpperCase()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Neg: {(Number(exam.negative_marking_ratio || 0.25) * 100).toFixed(0)}%
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">{exam.name}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">{exam.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={`/practice/${exam.slug}`}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
                >
                  View Exam Sections &rarr;
                </Link>
                <Link
                  href={`/tests?exam=${exam.slug}`}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Browse Mocks
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Subject, Chapter & Topic Breakdown */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-slate-900">2. Complete 4-Subject Curriculum</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Practice questions curated chapter-by-chapter across the core entrance disciplines.
        </p>

        <div className="mt-6 space-y-8">
          {subjects.map((subject) => {
            const meta = subjectMeta[subject.slug] || {
              icon: "📚",
              badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
              borderClass: "border-slate-200",
            };

            return (
              <div key={subject.id} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{meta.icon}</span>
                      <h3 className="text-2xl font-black text-slate-900">{subject.name}</h3>
                      <span className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase border ${meta.badgeClass}`}>
                        {subject.slug}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                      {subject.chapters.length} chapters &bull; {subject.chapters.reduce((acc, ch) => acc + ch.topics.length, 0)} topics
                    </span>
                  </div>
                  {subject.description && (
                    <p className="mt-2 text-sm text-slate-600">{subject.description}</p>
                  )}
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
                      <h4 className="text-base font-bold text-slate-900">{chapter.name}</h4>
                      {chapter.description && (
                        <p className="mt-1 text-xs text-slate-500">{chapter.description}</p>
                      )}

                      <div className="mt-4 space-y-2">
                        {chapter.topics.map((topic) => (
                          <Link
                            key={topic.id}
                            href={`/practice/topic/${topic.slug}`}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-blue-600 hover:text-blue-900 shadow-2xs hover:shadow-xs"
                          >
                            <span>{topic.name}</span>
                            <span className="text-xs font-bold text-blue-700">Practice &rarr;</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

