import Link from "next/link";
import { getPublishedExams, getSubjectsWithHierarchy } from "@/lib/content/queries";

export default async function PracticeDirectoryPage() {
  const [exams, subjects] = await Promise.all([
    getPublishedExams(),
    getSubjectsWithHierarchy(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Question Bank & Syllabus</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Targeted Practice
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Explore the complete curriculum structure designed specifically for IIITH UGEE (SUPR & REAP) and SPEC entrance examinations.
        </p>
      </div>

      {/* Target Entrance Exams */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">1. Select an Exam Track</h2>
        <p className="mt-1 text-sm text-slate-500">Each track is configured with official section breakdowns and timings.</p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {exams.map((exam) => (
            <div key={exam.id} className="border border-slate-200 bg-white p-6 transition-all hover:border-slate-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{exam.name}</h3>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
                  {exam.slug.toUpperCase()}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{exam.description}</p>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={`/practice/${exam.slug}`}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  View Exam Sections &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Subject, Chapter & Topic Breakdown */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold text-slate-900">2. Subject & Topic Hierarchy</h2>
        <p className="mt-1 text-sm text-slate-500">Practice questions curated by subject, chapter, and individual topics.</p>

        <div className="mt-6 space-y-8">
          {subjects.map((subject) => (
            <div key={subject.id} className="border border-slate-200 bg-white p-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">{subject.name}</h3>
                  <span className="text-xs text-slate-500">
                    {subject.chapters.length} chapters &bull; {subject.chapters.reduce((acc, ch) => acc + ch.topics.length, 0)} topics
                  </span>
                </div>
                {subject.description && (
                  <p className="mt-1 text-sm text-slate-600">{subject.description}</p>
                )}
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {subject.chapters.map((chapter) => (
                  <div key={chapter.id} className="rounded-md border border-slate-150 bg-slate-50/50 p-4">
                    <h4 className="text-base font-semibold text-slate-900">{chapter.name}</h4>
                    {chapter.description && (
                      <p className="mt-1 text-xs text-slate-500">{chapter.description}</p>
                    )}

                    <div className="mt-4 space-y-2">
                      {chapter.topics.map((topic) => (
                        <Link
                          key={topic.id}
                          href={`/practice/topic/${topic.slug}`}
                          className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-all hover:border-teal-600 hover:text-teal-800"
                        >
                          <span className="font-medium">{topic.name}</span>
                          <span className="text-xs text-teal-700">Practice &rarr;</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

