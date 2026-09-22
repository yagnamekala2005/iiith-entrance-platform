"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AttemptForTaking, AttemptQuestionTaking } from "@/types/content";
import { QuestionPalette } from "./question-palette";
import { SubmitModal } from "./submit-modal";
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
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const difficultyColors = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  // 1. Select option
  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion) return;

    // Optimistic update
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

  // 4. Submit test
  const handleConfirmSubmit = async () => {
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

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      {/* Test Taking Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-3.5 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-teal-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
              Practice Attempt
            </span>
            <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
              {data.test.name}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-save status badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-500"></span>
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  ✓ Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-rose-600 font-medium">
                  ⚠️ Save Error
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSubmitModalOpen(true)}
              className="rounded-md bg-teal-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-teal-800"
            >
              Submit Test
            </button>
          </div>
        </div>
      </header>

      {/* Main Taking Body */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Question Display Column (2 cols wide) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs">
              {/* Question metadata header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-800 px-2.5 py-1 text-xs font-bold text-white">
                    Q{currentIndex + 1} of {totalQuestions}
                  </span>
                  {currentQuestion.section_name && (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {currentQuestion.section_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${
                      difficultyColors[currentQuestion.difficulty] || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    +{currentQuestion.marks} / -{currentQuestion.negative_marks}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="mt-6 text-base leading-relaxed text-slate-900 font-normal whitespace-pre-wrap">
                {currentQuestion.question_text}
              </div>

              {/* MCQ Options */}
              <div className="mt-8 space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentQuestion.selected_option_id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left text-sm transition-all ${
                        isSelected
                          ? "border-teal-700 bg-teal-50/50 text-teal-950 ring-2 ring-teal-700 shadow-xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isSelected
                            ? "bg-teal-700 text-white"
                            : "border border-slate-300 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {option.option_label}
                      </span>
                      <span className="pt-0.5 leading-relaxed">{option.option_text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMark}
                  className={`rounded-md border px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    currentQuestion.marked_for_review
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {currentQuestion.marked_for_review ? "★ Marked for Review" : "☆ Mark for Review"}
                </button>

                {currentQuestion.selected_option_id && (
                  <button
                    type="button"
                    onClick={handleClearAnswer}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  &larr; Previous
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="rounded-md bg-teal-700 px-5 py-2 text-xs font-bold uppercase text-white shadow-xs hover:bg-teal-800"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="rounded-md bg-emerald-700 px-5 py-2 text-xs font-bold uppercase text-white shadow-xs hover:bg-emerald-800"
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette Column (1 col wide) */}
          <div>
            <QuestionPalette
              questions={questions}
              currentIndex={currentIndex}
              onSelectQuestion={(idx) => setCurrentIndex(idx)}
            />
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        isSubmitting={isSubmitting}
        questions={questions}
      />
    </div>
  );
}
