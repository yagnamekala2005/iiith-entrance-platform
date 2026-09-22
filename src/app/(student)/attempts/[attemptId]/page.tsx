import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAttemptForTaking } from "@/lib/attempts/queries";
import { TakingInterface } from "@/components/attempts/taking-interface";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptTakingPage({ params }: PageProps) {
  const { attemptId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const attemptData = await getAttemptForTaking(attemptId);

  if (!attemptData) {
    notFound();
  }

  // If already submitted, redirect straight to results
  if (attemptData.attempt.status === "submitted") {
    redirect(`/attempts/${attemptId}/result`);
  }

  return <TakingInterface data={attemptData} />;
}

