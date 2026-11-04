"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startTestAttempt } from "@/lib/attempts/actions";

interface StartAttemptButtonProps {
  testId: string;
  hasActiveAttempt?: boolean;
  activeAttemptId?: string;
  size?: "sm" | "md" | "lg";
  isProfileComplete?: boolean;
  returnUrl?: string;
}

export function StartAttemptButton({
  testId,
  hasActiveAttempt,
  activeAttemptId,
  size = "md",
  isProfileComplete = true,
  returnUrl,
}: StartAttemptButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (hasActiveAttempt && activeAttemptId) {
      router.prefetch(`/attempts/${activeAttemptId}`);
    }
  }, [hasActiveAttempt, activeAttemptId, router]);

  const sizeClasses =
    size === "sm"
      ? "px-4 py-2 text-xs font-bold"
      : size === "lg"
      ? "px-8 py-3.5 text-sm sm:text-base font-bold"
      : "px-5 py-2.5 text-xs sm:text-sm font-bold";

  // If profile is not complete and user doesn't already have an active attempt, prompt to complete profile
  if (!hasActiveAttempt && isProfileComplete === false) {
    return (
      <button
        type="button"
        onClick={() => {
          const target = `/profile?notice=profile_required${
            returnUrl ? `&returnTo=${encodeURIComponent(returnUrl)}` : ""
          }`;
          router.push(target);
        }}
        className={`rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 active:scale-95 transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs ${sizeClasses}`}
        title="Complete student profile to unlock mock test"
      >
        <span>🔒</span>
        <span>Complete Profile to Unlock →</span>
      </button>
    );
  }

  const handleStartOrResume = async () => {
    if (hasActiveAttempt && activeAttemptId) {
      setIsLoading(true);
      router.push(`/attempts/${activeAttemptId}`);
      return;
    }

    setIsLoading(true);
    const res = await startTestAttempt(testId);

    if (res.success && res.data) {
      router.push(`/attempts/${res.data.attemptId}`);
    } else {
      setIsLoading(false);
      if (res.error?.toLowerCase().includes("profile")) {
        router.push(
          `/profile?notice=profile_required${
            returnUrl ? `&returnTo=${encodeURIComponent(returnUrl)}` : ""
          }`
        );
        return;
      }
      alert(res.error || "Failed to start attempt. Please log in and try again.");
    }
  };

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleStartOrResume}
      className={`rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-wider flex items-center justify-center gap-2 ${sizeClasses}`}
    >
      {isLoading ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          <span>{hasActiveAttempt ? "Opening Exam..." : "Launching Exam..."}</span>
        </>
      ) : hasActiveAttempt ? (
        "Resume Live Exam →"
      ) : (
        "Start Mock Exam →"
      )}
    </button>
  );
}
