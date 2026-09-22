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
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Link href="/practice" className="hover:text-teal-800">Practice</Link>
        <span>/</span>
        <span>{topicData.subject.name}</span>
        <span>/</span>
        <span>{topicData.chapter.name}</span>
        <span>/</span>
        <span className="text-teal-700">{topicData.name}</span>
      </div>

      <div className="mt-4 border-b border-slate-200 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {topicData.name}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              {topicData.description || `Focused practice questions for ${topicData.name}.`}
            </p>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-5 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Topic Questions</p>
            <p className="text-2xl font-bold text-teal-800">{topicQuestions.length}</p>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Questions ({topicQuestions.length})
          </h2>
          <span className="text-xs text-slate-500">All questions database-backed</span>
        </div>

        {topicQuestions.length === 0 ? (
          <div className="mt-6 border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">No questions published yet for this topic.</p>
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

