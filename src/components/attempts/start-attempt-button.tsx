"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { startTestAttempt } from "@/lib/attempts/actions";

interface StartAttemptButtonProps {
  testId: string;
  hasActiveAttempt?: boolean;
  activeAttemptId?: string;
}

export function StartAttemptButton({
  testId,
  hasActiveAttempt,
  activeAttemptId,
}: StartAttemptButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartOrResume = async () => {
    if (hasActiveAttempt && activeAttemptId) {
      router.push(`/attempts/${activeAttemptId}`);
      return;
    }

    setIsLoading(true);
    const res = await startTestAttempt(testId);
    setIsLoading(false);

    if (res.success && res.data) {
      router.push(`/attempts/${res.data.attemptId}`);
    } else {
      alert(res.error || "Failed to start attempt. Please log in and try again.");
    }
  };

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleStartOrResume}
      className="rounded-md bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"
    >
      {isLoading
        ? "Preparing Practice Set..."
        : hasActiveAttempt
        ? "Continue In-Progress Attempt →"
        : "Start Practice Attempt →"}
    </button>
  );
}

