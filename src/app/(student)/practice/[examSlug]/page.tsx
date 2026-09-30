import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getSubjectsWithHierarchy } from "@/lib/content/queries";

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

export default async function ExamPracticePage({ params }: PageProps) {
  const { examSlug } = await params;
  const exam = await getExamBySlug(examSlug);

  if (!exam) {
    notFound();
  }

  const subjects = await getSubjectsWithHierarchy();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/practice" className="hover:text-blue-700">Practice</Link>
        <span>/</span>
        <span className="text-blue-700">{exam.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
              Exam Track
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {exam.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{exam.description}</p>
          </div>
          <Link
            href={`/tests?exam=${exam.slug}`}
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
          >
            Browse {exam.slug.toUpperCase()} Mock Tests &rarr;
          </Link>
        </div>
      </div>

      {/* Sections breakdown */}
      <section className="mt-8">
        <h2 className="text-xl font-extrabold text-slate-900">Exam Sections</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          The exam structure and timings configured directly for this entrance track.
        </p>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {exam.sections.map((section) => (
            <div key={section.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase text-blue-800 border border-blue-200">
                    Section {section.display_order}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Duration: {Math.round(section.default_duration_seconds / 60)} mins
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{section.name}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{section.description}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={`/practice/${exam.slug}/${section.slug}`}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
                >
                  Enter Section Practice &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Relevant Subjects */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold text-slate-900">Curriculum by Subject</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">4 core disciplines assessed across the entrance exam.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((sub) => (
            <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-base font-bold text-slate-900">{sub.name}</h3>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{sub.description}</p>
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {sub.chapters.map((ch) => (
                  <div key={ch.id} className="text-xs text-slate-600 font-medium">
                    &bull; {ch.name} <span className="text-slate-400">({ch.topics.length} topics)</span>
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

