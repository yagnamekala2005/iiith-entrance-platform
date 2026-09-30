"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { startTestAttempt } from "@/lib/attempts/actions";

interface StartAttemptButtonProps {
  testId: string;
  hasActiveAttempt?: boolean;
  activeAttemptId?: string;
  size?: "sm" | "md" | "lg";
}

export function StartAttemptButton({
  testId,
  hasActiveAttempt,
  activeAttemptId,
  size = "md",
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

  const sizeClasses =
    size === "sm"
      ? "px-4 py-2 text-xs font-bold"
      : size === "lg"
      ? "px-8 py-3.5 text-sm sm:text-base font-bold"
      : "px-5 py-2.5 text-xs sm:text-sm font-bold";

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleStartOrResume}
      className={`rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-wider ${sizeClasses}`}
    >
      {isLoading
        ? "Initializing CBT Session..."
        : hasActiveAttempt
        ? "Resume Live Exam &rarr;"
        : "Start Mock Exam &rarr;"}
    </button>
  );
}
