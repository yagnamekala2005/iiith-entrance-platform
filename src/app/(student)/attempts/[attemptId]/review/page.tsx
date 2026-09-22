import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttemptReview } from "@/lib/attempts/queries";
import { ReviewInterface } from "@/components/attempts/review-interface";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptReviewPage({ params }: PageProps) {
  const { attemptId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const reviewData = await getAttemptReview(attemptId);

  if (!reviewData) {
    notFound();
  }

  return <ReviewInterface data={reviewData} />;
}

