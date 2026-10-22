import { getLearningProgress, getSubjectsWithHierarchy } from "@/lib/content/queries";
import { getCachedAuthUser } from "@/lib/auth/session";
import { StudentLearningView } from "@/components/learning/student-learning-view";

export const dynamic = "force-dynamic";

export default async function MyLearningPage() {
  const user = await getCachedAuthUser();
  if (!user) return null;

  const [subjects, learningProgress] = await Promise.all([
    getSubjectsWithHierarchy(),
    getLearningProgress(user.id),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* Interactive Curriculum with Notes, Formulas & PDF/Book Materials */}
      <StudentLearningView subjects={subjects} learningProgress={learningProgress} />
    </main>
  );
}
