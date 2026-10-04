import Link from "next/link";
import { getPublishedExams, getSubjectsWithHierarchy } from "@/lib/content/queries";
import { StudentLearningView } from "@/components/learning/student-learning-view";

export const dynamic = "force-dynamic";

export default async function MyLearningPage() {
  const [exams, subjects] = await Promise.all([
    getPublishedExams(),
    getSubjectsWithHierarchy(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* 1-Step Back Navigation */}
      <div className="mb-3">
        <Link
          href="/dashboard"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to Student Dashboard"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
        <Link href="/dashboard" prefetch={true} className="hover:text-blue-700">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-blue-700">My Learning</span>
      </div>

      {/* Interactive Curriculum with Notes, Formulas & PDF/Book Materials */}
      <StudentLearningView subjects={subjects} />
    </main>
  );
}
