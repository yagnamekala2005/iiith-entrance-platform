import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicBySlug, getPublishedQuestions } from "@/lib/content/queries";
import { QuestionCard } from "@/components/practice/question-card";

interface PageProps {
  params: Promise<{ topicSlug: string }>;
}

export default async function TopicPracticePage({ params }: PageProps) {
  const { topicSlug } = await params;
  const topicData = await getTopicBySlug(topicSlug);

  if (!topicData) {
    notFound();
  }

  const allQuestions = await getPublishedQuestions();
  const topicQuestions = allQuestions.filter((q) => q.topic_id === topicData.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Link href="/practice" className="hover:text-blue-700">Practice</Link>
        <span>/</span>
        <span>{topicData.subject.name}</span>
        <span>/</span>
        <span>{topicData.chapter.name}</span>
        <span>/</span>
        <span className="text-blue-700">{topicData.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase text-blue-800 border border-blue-200">
                {topicData.subject.name}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {topicData.chapter.name}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {topicData.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              {topicData.description || `Focused practice questions for ${topicData.name}.`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-right shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Topic Questions</p>
            <p className="text-3xl font-black text-blue-700">{topicQuestions.length}</p>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Practice Questions ({topicQuestions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Database-backed question bank with verified solutions</p>
          </div>
        </div>

        {topicQuestions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <span className="text-3xl">📖</span>
            <p className="mt-2 text-sm text-slate-600">No questions published yet for this topic.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {topicQuestions.map((question, idx) => (
              <QuestionCard key={question.id} question={question} index={idx} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

