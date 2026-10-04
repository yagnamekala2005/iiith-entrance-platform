"use client";

import React, { useState, useEffect, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AttemptForTaking, AttemptQuestionTaking } from "@/types/content";
import { QuestionPalette } from "./question-palette";
import { SubmitModal } from "./submit-modal";
import { ScientificCalculator } from "@/components/calculator/scientific-calculator";
import { AntiScreenshotShield } from "@/components/security/anti-screenshot-shield";
import {
  saveAttemptAnswer,
  clearAttemptAnswer,
  toggleAttemptMarkForReview,
  submitTestAttempt,
} from "@/lib/attempts/actions";

interface TakingInterfaceProps {
  data: AttemptForTaking;
}

export function TakingInterface({ data }: TakingInterfaceProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<AttemptQuestionTaking[]>(data.questions);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState<boolean>(false);

  // Unified Step-Back Handler (Navigates 1 step back to previous page instead of exiting app)
  const handleStepBack = (e?: Event | React.SyntheticEvent) => {
    // 1. If Scientific Calculator is open, close it (1 step back)
    if (isCalculatorOpen) {
      if (e) e.preventDefault();
      setIsCalculatorOpen(false);
      return;
    }
    // 2. If Question Palette drawer is open, close it (1 step back)
    if (isMobilePaletteOpen) {
      if (e) e.preventDefault();
      setIsMobilePaletteOpen(false);
      return;
    }
    // 3. If Submit Modal is open, close it (1 step back)
    if (isSubmitModalOpen) {
      if (e) e.preventDefault();
      setIsSubmitModalOpen(false);
      return;
    }
    // 4. If Exit Modal is open, safely return to previous page (1 step back)
    if (isExitModalOpen) {
      if (e) e.preventDefault();
      setIsExitModalOpen(false);
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/tests");
      }
      return;
    }
    // 5. Open safe Pause & Return to Previous Page dialog
    if (e) e.preventDefault();
    setIsExitModalOpen(true);
  };

  // Keep handleStepBackRef updated to latest closure without triggering history pushes
  const handleStepBackRef = useRef(handleStepBack);
  handleStepBackRef.current = handleStepBack;

  // Prevent app exit on mobile back button/gesture by intercepting popstate and exam-step-back
  useEffect(() => {
    // Push dummy history entry so back button doesn't close the browser/app
    if (typeof window !== "undefined" && window.history.state?.cbtTaking !== true) {
      window.history.pushState({ cbtTaking: true }, "");
    }

    const onPopState = () => {
      handleStepBackRef.current();
    };

    const onExamStepBack = (e: Event) => {
      handleStepBackRef.current(e);
    };

    window.addEventListener("popstate", onPopState);
    window.addEventListener("exam-step-back", onExamStepBack);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("exam-step-back", onExamStepBack);
    };
  }, []);

  // Protect against accidental browser/tab closure
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSubmitting]);

  // Total test duration in seconds (default 3 hours = 10800s)
  const totalDurationSeconds = data.test.duration_seconds || 10800;

  // Initialize remaining time using started_at
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    try {
      const startTime = new Date(data.attempt.started_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      const remaining = totalDurationSeconds - elapsedSeconds;
      return remaining > 0 ? remaining : 0;
    } catch {
      return totalDurationSeconds;
    }
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Group questions by subject
  const subjects = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; startIndex: number; count: number }>();
    questions.forEach((q, idx) => {
      const subName = q.subject_name || "General";
      const subSlug = q.subject_slug || "general";
      if (!map.has(subName)) {
        map.set(subName, {
          name: subName,
          slug: subSlug,
          startIndex: idx,
          count: 0,
        });
      }
      map.get(subName)!.count += 1;
    });
    return Array.from(map.values());
  }, [questions]);

  // Current question and subject
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const currentSubjectName = currentQuestion?.subject_name || "General";

  // Real-time Countdown Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // Submit test handler
  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const res = await submitTestAttempt(data.attempt.id);

    if (res.success) {
      startTransition(() => {
        router.push(`/attempts/${data.attempt.id}/result`);
      });
    } else {
      setIsSubmitting(false);
      alert(res.error || "Failed to submit test. Please check your connection and try again.");
    }
  };

  // Auto-submit when timer expires
  useEffect(() => {
    if (secondsRemaining <= 0 && !autoSubmitTriggered && !isSubmitting) {
      setAutoSubmitTriggered(true);
      setIsSubmitModalOpen(false);
      setIsMobilePaletteOpen(false);
      handleConfirmSubmit();
    }
  }, [secondsRemaining, autoSubmitTriggered, isSubmitting]);

  // 1. Select option
  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion) return;

    // Fast optimistic update
    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQuestion,
      selected_option_id: optionId,
      status: "answered",
    };
    setQuestions(updated);
    setSaveStatus("saving");

    const res = await saveAttemptAnswer(
      data.attempt.id,
      currentQuestion.question_id,
      optionId
    );

    if (res.success) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      console.error("Save answer failed:", res.error);
    }
  };

  // 2. Clear answer
  const handleClearAnswer = async () => {
    if (!currentQuestion || !currentQuestion.selected_option_id) return;

    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQuestion,
      selected_option_id: null,
      status: "unanswered",
    };
    setQuestions(updated);
    setSaveStatus("saving");

    const res = await clearAttemptAnswer(
      data.attempt.id,
      currentQuestion.question_id
    );

    if (res.success) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  // 3. Toggle mark for review
  const handleToggleMark = async () => {
    if (!currentQuestion) return;

    const newMarked = !currentQuestion.marked_for_review;
    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQuestion,
      marked_for_review: newMarked,
    };
    setQuestions(updated);
    setSaveStatus("saving");

    const res = await toggleAttemptMarkForReview(
      data.attempt.id,
      currentQuestion.question_id,
      newMarked
    );

    if (res.success) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  };

  // 4. Mark & Next
  const handleMarkAndNext = async () => {
    await handleToggleMark();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // 5. Save & Next
  const handleSaveAndNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsSubmitModalOpen(true);
    }
  };

  const difficultyColors = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  // Timer warning thresholds
  const isTimeLow = secondsRemaining <= 300; // < 5 mins
  const isTimeWarning = secondsRemaining <= 900 && secondsRemaining > 300; // < 15 mins

  const totalAttemptedCount = questions.filter((q) => q.selected_option_id).length;

  // Scientific Calculator: Allowed in Maths, Physics, Chemistry; Hidden in Aptitude
  const currentSubjectLower = (currentSubjectName || "").toLowerCase();
  const isAptitudeSubject = currentSubjectLower.includes("aptitude") || currentSubjectLower.includes("reasoning");
  const canUseCalculator = !isAptitudeSubject;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans selection:bg-blue-600 selection:text-white cbt-exam-container no-screenshot">
      {/* Strict Anti-Screenshot & Screen Capture Protection Shield */}
      <AntiScreenshotShield strictExamMode={true} />

      {/* Auto-Submit Expiration Modal */}
      {autoSubmitTriggered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
              ⏰
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-900">Time Has Expired!</h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your test duration has ended. The system is automatically evaluating and scoring your answers.
            </p>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800">
                <span className="h-2 w-2 animate-ping rounded-full bg-blue-600"></span>
                Submitting Exam & Grading Answers...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top CBT Real-Time Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5">
          {/* Left: 1-Step Back Navigation & Test Info */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handleStepBack()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-800 transition-all shadow-xs"
              title="Pause and return to previous page"
              aria-label="Return to previous page"
            >
              <span className="text-sm font-black leading-none">‹</span>
              <span className="text-xs font-bold">Previous Page</span>
            </button>

            <span className="rounded-lg bg-blue-700 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-black tracking-widest text-white uppercase shadow-xs">
              CBT
            </span>
            <div>
              <h1 className="text-xs sm:text-base font-extrabold text-slate-900 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                {data.test.name}
              </h1>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                {data.test.exam?.name || "IIITH Entrance"} &bull; Real-Time Evaluated
              </p>
            </div>
          </div>

          {/* Right: Timer, Calculator (STEM), Mobile Palette Toggle, Submit */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            {/* Real-Time Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3.5 py-1 sm:py-1.5 transition-all ${
                isTimeLow
                  ? "border-rose-400 bg-rose-50 text-rose-700 animate-pulse"
                  : isTimeWarning
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-slate-300 bg-slate-50 text-slate-900"
              }`}
            >
              <span className="text-sm sm:text-base">⏱️</span>
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold tracking-wider leading-none opacity-60 hidden sm:block">
                  Time Left
                </p>
                <p className="font-mono text-xs sm:text-base font-black tracking-tight">
                  {formatTime(secondsRemaining)}
                </p>
              </div>
            </div>

            {/* Scientific Calculator Quick Action (Maths, Physics, Chemistry only) */}
            {canUseCalculator && (
              <button
                type="button"
                onClick={() => setIsCalculatorOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all shadow-xs ${
                  isCalculatorOpen
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50/60"
                }`}
                title="Open Scientific Calculator (Maths, Physics & Chemistry)"
              >
                <span className="text-sm sm:text-base">🧮</span>
                <span className="hidden sm:inline">Calculator</span>
              </button>
            )}

            {/* Sync state badge (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-500"></span>
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                  ✓ Saved
                </span>
              )}
            </div>

            {/* Mobile Palette Open Button */}
            <button
              type="button"
              onClick={() => setIsMobilePaletteOpen(true)}
              className="lg:hidden rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700"
              aria-label="Open Question Palette"
            >
              📋 {totalAttemptedCount}/{totalQuestions}
            </button>

            {/* Finish & Submit Button */}
            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="rounded-xl bg-emerald-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Submit
            </button>
          </div>
        </div>

        {/* 4 Subjects Navigation Tabs */}
        <div className="border-t border-slate-200/80 bg-slate-50/90 px-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 sm:gap-2 overflow-x-auto py-2 no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pr-1 shrink-0 hidden sm:inline">
              Sections:
            </span>
            {subjects.map((sub) => {
              const isCurrent = sub.name === currentSubjectName;
              const subQuestions = questions.filter((q) => (q.subject_name || "General") === sub.name);
              const answeredCount = subQuestions.filter((q) => q.selected_option_id).length;

              return (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => setCurrentIndex(sub.startIndex)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                    isCurrent
                      ? "bg-blue-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-900"
                  }`}
                >
                  <span>{sub.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isCurrent ? "bg-blue-900 text-blue-200" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {answeredCount}/{sub.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main CBT Question Body */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Question Display Column (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              {/* Question metadata header */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-700 px-3 py-1 text-xs font-black text-white shadow-xs">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  <span className="rounded bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
                    {currentSubjectName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-bold uppercase ${
                      difficultyColors[currentQuestion?.difficulty || "medium"]
                    }`}
                  >
                    {currentQuestion?.difficulty}
                  </span>
                  <span className="rounded bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700 font-mono">
                    +{currentQuestion?.marks} / -{currentQuestion?.negative_marks}
                  </span>
                </div>
              </div>

              {/* Question Statement */}
              <div className="mt-5 text-base sm:text-lg leading-relaxed text-slate-900 font-normal whitespace-pre-wrap select-none">
                {currentQuestion?.question_text}
              </div>

              {/* 4 MCQ Option Tiles */}
              <div className="mt-6 sm:mt-8 space-y-3">
                {currentQuestion?.options.map((option) => {
                  const isSelected = currentQuestion.selected_option_id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left text-sm sm:text-base transition-all min-h-[52px] ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-600 shadow-xs font-medium"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                          isSelected
                            ? "bg-blue-700 text-white"
                            : "border border-slate-300 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {option.option_label}
                      </span>
                      <span className="pt-0.5 leading-relaxed font-normal">
                        {option.option_text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Real-Time Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleToggleMark}
                  className={`flex-1 sm:flex-none rounded-xl border px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-bold uppercase tracking-wider transition-all text-center ${
                    currentQuestion?.marked_for_review
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {currentQuestion?.marked_for_review ? "★ Marked" : "☆ Mark Review"}
                </button>

                {currentQuestion?.selected_option_id && (
                  <button
                    type="button"
                    onClick={handleClearAnswer}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="flex-1 sm:flex-none rounded-xl border border-slate-300 bg-white px-3.5 sm:px-4 py-2.5 sm:py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white text-center"
                >
                  &larr; Prev
                </button>

                <button
                  type="button"
                  onClick={handleMarkAndNext}
                  className="rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold uppercase text-purple-800 hover:bg-purple-100 hidden sm:block"
                >
                  Mark & Next
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    className="flex-1 sm:flex-none rounded-xl bg-blue-700 px-4 sm:px-5 py-2.5 sm:py-2 text-xs font-bold uppercase text-white shadow-xs hover:bg-blue-800 active:scale-95 transition-all text-center"
                  >
                    Save & Next &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 sm:px-5 py-2.5 sm:py-2 text-xs font-bold uppercase text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all text-center"
                  >
                    Submit Exam &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Right Question Palette Column */}
          <div className="hidden lg:block">
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              currentSubject={currentSubjectName}
              onSelectQuestion={(idx) => setCurrentIndex(idx)}
            />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Question Palette Drawer Modal */}
      {isMobilePaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-2 sm:p-4 lg:hidden animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Exam Question Palette</h3>
              <button
                type="button"
                onClick={() => setIsMobilePaletteOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="mt-3">
              <QuestionPalette
                questions={questions}
                currentIndex={currentIndex}
                currentSubject={currentSubjectName}
                onSelectQuestion={(idx) => {
                  setCurrentIndex(idx);
                  setIsMobilePaletteOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Right Edge Docked Scientific Calculator Button (Only on STEM questions: Maths, Physics, Chemistry - Hidden on Aptitude) */}
      {canUseCalculator && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
          <button
            type="button"
            onClick={() => setIsCalculatorOpen((prev) => !prev)}
            className="group flex flex-col items-center gap-1 rounded-l-2xl border-y border-l border-blue-400 bg-gradient-to-b from-blue-700 via-indigo-700 to-blue-900 py-3 px-2 sm:px-2.5 text-white shadow-2xl hover:from-blue-600 hover:to-indigo-600 active:scale-95 transition-all"
            title="Open Scientific Calculator (Maths, Physics, Chemistry)"
          >
            <span className="text-lg sm:text-2xl drop-shadow-md">🧮</span>
            <span className="[writing-mode:vertical-rl] text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-100 mt-1">
              CALC
            </span>
          </button>
        </div>
      )}

      {/* Interactive Scientific Calculator Tool */}
      <ScientificCalculator
        isOpen={isCalculatorOpen && canUseCalculator}
        onClose={() => setIsCalculatorOpen(false)}
        currentSubject={currentSubjectName}
      />

      {/* Submit Confirmation Modal */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        questions={questions}
        timeRemainingFormatted={formatTime(secondsRemaining)}
      />

      {/* Safe Exit Confirmation Modal (1 Step Back from Exam) */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
              ⏸️
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-slate-900">
              Return to Previous Page?
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your test is safely paused. All answered questions and remaining time are preserved in real-time. You can resume this exam at any time.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  if (typeof window !== "undefined" && window.history.state?.cbtTaking !== true) {
                    window.history.pushState({ cbtTaking: true }, "");
                  }
                }}
                className="flex-1 rounded-xl bg-blue-700 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800 shadow-md shadow-blue-700/20 active:scale-95 transition-all"
              >
                Keep Writing Exam
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false);
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/tests");
                  }
                }}
                className="flex-1 rounded-xl border border-slate-300 bg-slate-100 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
              >
                ← Return to Previous Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
