import { notFound, redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getAttemptForTaking } from "@/lib/attempts/queries";
import { TakingInterface } from "@/components/attempts/taking-interface";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptTakingPage({ params }: PageProps) {
  const { attemptId } = await params;

  const user = await getCachedAuthUser();

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

