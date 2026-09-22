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
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/practice" className="hover:text-teal-800">Practice</Link>
        <span>/</span>
        <span className="text-teal-700">{exam.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {exam.name}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">{exam.description}</p>
          </div>
          <Link
            href={`/tests?exam=${exam.slug}`}
            className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Browse {exam.slug.toUpperCase()} Mock Tests &rarr;
          </Link>
        </div>
      </div>

      {/* Sections breakdown */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Exam Sections</h2>
        <p className="mt-1 text-sm text-slate-500">
          The exam structure and timings configured directly from the database.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {exam.sections.map((section) => (
            <div key={section.id} className="flex flex-col justify-between border border-slate-200 bg-white p-6 shadow-xs">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold uppercase text-teal-800">
                    Section {section.display_order}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Duration: {Math.round(section.default_duration_seconds / 60)} mins
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900">{section.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{section.description}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <Link
                  href={`/practice/${exam.slug}/${section.slug}`}
                  className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                >
                  Enter Section Practice &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Relevant Subjects */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold text-slate-900">Curriculum by Subject</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((sub) => (
            <div key={sub.id} className="border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">{sub.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{sub.description}</p>
              <div className="mt-4 space-y-1">
                {sub.chapters.map((ch) => (
                  <div key={ch.id} className="text-xs text-slate-600">
                    &bull; {ch.name} ({ch.topics.length} topics)
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

