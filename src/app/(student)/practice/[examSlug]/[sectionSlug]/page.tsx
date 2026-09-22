import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug, getPublishedQuestions } from "@/lib/content/queries";
import { QuestionCard } from "@/components/practice/question-card";

interface PageProps {
  params: Promise<{ examSlug: string; sectionSlug: string }>;
}

export default async function SectionPracticePage({ params }: PageProps) {
  const { examSlug, sectionSlug } = await params;
  const exam = await getExamBySlug(examSlug);

  if (!exam) {
    notFound();
  }

  const section = exam.sections.find((s) => s.slug === sectionSlug);
  if (!section) {
    notFound();
  }

  // Fetch all published questions
  const allQuestions = await getPublishedQuestions();
  // Filter questions for this exam and section
  const sectionQuestions = allQuestions.filter(
    (q) => q.exam_id === exam.id && q.section_id === section.id
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/practice" className="hover:text-teal-800">Practice</Link>
        <span>/</span>
        <Link href={`/practice/${exam.slug}`} className="hover:text-teal-800">{exam.name}</Link>
        <span>/</span>
        <span className="text-teal-700">{section.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold uppercase text-teal-800">
                Section {section.display_order}
              </span>
              <span className="text-xs text-slate-500">
                Duration: {Math.round(section.default_duration_seconds / 60)} minutes
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {section.name}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">{section.description}</p>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Questions</p>
            <p className="text-2xl font-bold text-teal-800">{sectionQuestions.length}</p>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Practice Questions ({sectionQuestions.length})
          </h2>
          <p className="text-xs text-slate-500">Answer keys protected &bull; Self-study mode</p>
        </div>

        {sectionQuestions.length === 0 ? (
          <div className="mt-6 border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No questions published yet for this section.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {sectionQuestions.map((question, idx) => (
              <QuestionCard key={question.id} question={question} index={idx} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

