"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { AttemptReview, AttemptReviewQuestion } from "@/types/content";

interface ReviewInterfaceProps {
  data: AttemptReview;
}

export function ReviewInterface({ data }: ReviewInterfaceProps) {
  const [filter, setFilter] = useState<"all" | "incorrect" | "correct" | "unanswered">("all");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  const { attempt, test, questions } = data;

  const filteredQuestions = questions.filter((q) => {
    if (filter === "correct") return q.is_correct;
    if (filter === "incorrect") return !q.is_correct && !q.is_unanswered;
    if (filter === "unanswered") return q.is_unanswered;
    return true;
  });

  const currentQuestion: AttemptReviewQuestion | undefined = filteredQuestions[selectedQuestionIndex] || filteredQuestions[0];

  const difficultyColors = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Link href={`/attempts/${attempt.id}/result`} className="hover:text-teal-800">&larr; Result Scorecard</Link>
              <span>/</span>
              <span className="text-teal-700">Detailed Answer Review</span>
            </div>
            <h1 className="mt-1 text-lg font-bold text-slate-900">{test.name}</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="rounded bg-teal-50 px-3 py-1 text-sm font-bold text-teal-800">
              Score: {attempt.score.toFixed(2)} / {attempt.max_score.toFixed(2)}
            </span>
            <Link
              href="/tests"
              className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50"
            >
              Exit Review
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Body */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-6 sm:px-6">
        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setFilter("all"); setSelectedQuestionIndex(0); }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              All Questions ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilter("incorrect"); setSelectedQuestionIndex(0); }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === "incorrect"
                  ? "bg-rose-600 text-white"
                  : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Incorrect ({attempt.incorrect_count})
            </button>
            <button
              type="button"
              onClick={() => { setFilter("correct"); setSelectedQuestionIndex(0); }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === "correct"
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Correct ({attempt.correct_count})
            </button>
            <button
              type="button"
              onClick={() => { setFilter("unanswered"); setSelectedQuestionIndex(0); }}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filter === "unanswered"
                  ? "bg-slate-600 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Unanswered ({attempt.unanswered_count})
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Showing {filteredQuestions.length} of {questions.length} questions
          </p>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-base font-medium text-slate-700">No questions match the selected filter.</p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              View all questions
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Details (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              {currentQuestion && (
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs">
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-bold text-white">
                        Q{currentQuestion.display_order}
                      </span>
                      {currentQuestion.section_name && (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {currentQuestion.section_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentQuestion.is_correct && (
                        <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                          ✓ Correct (+{currentQuestion.marks})
                        </span>
                      )}
                      {!currentQuestion.is_correct && !currentQuestion.is_unanswered && (
                        <span className="rounded bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-300">
                          ✗ Incorrect (-{currentQuestion.negative_marks})
                        </span>
                      )}
                      {currentQuestion.is_unanswered && (
                        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-300">
                          ○ Not Attempted (0.00)
                        </span>
                      )}
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${
                          difficultyColors[currentQuestion.difficulty] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mt-5 text-base leading-relaxed text-slate-900 font-normal whitespace-pre-wrap">
                    {currentQuestion.question_text}
                  </div>

                  {/* Options with Answer Key Highlighting */}
                  <div className="mt-6 space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isStudentSelected = currentQuestion.selected_option_id === option.id;
                      const isCorrect = currentQuestion.correct_option_id === option.id;

                      let optionCardClass = "border-slate-200 bg-white text-slate-700";
                      let badgeClass = "border border-slate-300 bg-slate-100 text-slate-700";

                      if (isCorrect) {
                        optionCardClass = "border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-500 font-medium";
                        badgeClass = "bg-emerald-600 text-white font-bold";
                      } else if (isStudentSelected && !isCorrect) {
                        optionCardClass = "border-rose-400 bg-rose-50/60 text-rose-950 ring-1 ring-rose-400";
                        badgeClass = "bg-rose-600 text-white font-bold";
                      }

                      return (
                        <div
                          key={option.id}
                          className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-sm transition-all ${optionCardClass}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${badgeClass}`}>
                              {option.option_label}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{option.option_text}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            {isCorrect && (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                Correct Answer ✓
                              </span>
                            )}
                            {isStudentSelected && !isCorrect && (
                              <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                Your Selection ✗
                              </span>
                            )}
                            {isStudentSelected && isCorrect && (
                              <span className="rounded bg-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                                (Your Answer)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Explanation Drawer */}
                  <div className="mt-8 rounded-lg border border-teal-200 bg-teal-50/40 p-5">
                    <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                      <span>💡 Detailed Explanation & Solution Steps</span>
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {currentQuestion.explanation || "No explanation provided for this question."}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation in review */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
                <button
                  type="button"
                  disabled={selectedQuestionIndex === 0}
                  onClick={() => setSelectedQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  &larr; Previous Question
                </button>

                <span className="text-xs text-slate-500 font-medium">
                  {selectedQuestionIndex + 1} of {filteredQuestions.length}
                </span>

                <button
                  type="button"
                  disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
                  onClick={() => setSelectedQuestionIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next Question &rarr;
                </button>
              </div>
            </div>

            {/* Review Question Palette (1 col wide) */}
            <div>
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Questions Overview
                </h3>

                <div className="mt-4 grid grid-cols-5 gap-2">
                  {filteredQuestions.map((q, idx) => {
                    const isSelected = idx === selectedQuestionIndex;
                    let btnClass = "border text-slate-600 bg-slate-100 border-slate-300";

                    if (q.is_correct) {
                      btnClass = "bg-emerald-600 text-white border-emerald-700 font-semibold";
                    } else if (!q.is_unanswered) {
                      btnClass = "bg-rose-600 text-white border-rose-700 font-semibold";
                    }

                    if (isSelected) {
                      btnClass += " ring-2 ring-teal-600 ring-offset-2";
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`flex h-10 w-10 items-center justify-center rounded-md text-xs transition-all ${btnClass}`}
                      >
                        {q.display_order}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-emerald-600"></span>
                      <span className="text-slate-600">Correct</span>
                    </div>
                    <span className="font-bold text-slate-900">{attempt.correct_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-rose-600"></span>
                      <span className="text-slate-600">Incorrect</span>
                    </div>
                    <span className="font-bold text-slate-900">{attempt.incorrect_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-slate-200 border border-slate-300"></span>
                      <span className="text-slate-600">Unanswered</span>
                    </div>
                    <span className="font-bold text-slate-900">{attempt.unanswered_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

