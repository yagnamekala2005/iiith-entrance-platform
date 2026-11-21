"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { AttemptReview, AttemptReviewQuestion } from "@/types/content";

interface ReviewInterfaceProps {
  data: AttemptReview;
}

export function ReviewInterface({ data }: ReviewInterfaceProps) {
  const [filter, setFilter] = useState<"all" | "attempted" | "unattempted" | "incorrect" | "correct">("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  const { attempt, test, questions, attempted_count, unattempted_count } = data;

  // Extract unique subjects
  const subjectNames = Array.from(new Set(questions.map((q) => q.subject_name || "General")));

  // Filter questions based on attempt status and subject
  const filteredQuestions = questions.filter((q) => {
    // Subject filter
    if (selectedSubjectFilter !== "all" && (q.subject_name || "General") !== selectedSubjectFilter) {
      return false;
    }

    // Status filter
    if (filter === "attempted") return !q.is_unanswered;
    if (filter === "unattempted") return q.is_unanswered;
    if (filter === "correct") return q.is_correct;
    if (filter === "incorrect") return !q.is_correct && !q.is_unanswered;
    return true;
  });

  const currentQuestion: AttemptReviewQuestion | undefined = filteredQuestions[selectedQuestionIndex] || filteredQuestions[0];

  const difficultyColors = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans pb-24 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-3 sm:px-6 shadow-xs pt-safe">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
              <Link href={`/attempts/${attempt.id}/result`} className="hover:text-[#2E3AE3] flex items-center gap-1 shrink-0 font-extrabold">
                <span>&larr;</span>
                <span>Scorecard</span>
              </Link>
              <span>/</span>
              <span className="text-[#2E3AE3] truncate">Solutions</span>
            </div>
            <h1 className="mt-0.5 text-sm sm:text-lg font-black text-[#1F2227] truncate" title={test.name}>
              {test.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="rounded-xl bg-[#EEF2FF] border border-[#2E3AE3]/20 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-black text-[#2E3AE3]">
              Score: {attempt.score.toFixed(2)} / {attempt.max_score.toFixed(2)}
            </span>
            <Link
              href="/dashboard"
              prefetch={true}
              className="rounded-xl border border-slate-200 bg-white px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Review Body */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-3.5 py-4 sm:px-6 sm:py-6">
        {/* Filter Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => { setFilter("all"); setSelectedQuestionIndex(0); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "all"
                  ? "bg-[#1F2227] text-white shadow-xs"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              All ({questions.length})
            </button>

            <button
              type="button"
              onClick={() => { setFilter("attempted"); setSelectedQuestionIndex(0); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "attempted"
                  ? "bg-[#2E3AE3] text-white shadow-xs"
                  : "border border-blue-200 bg-[#EEF2FF] text-[#2E3AE3] hover:bg-blue-100"
              }`}
            >
              Attempted ({attempted_count})
            </button>

            <button
              type="button"
              onClick={() => { setFilter("unattempted"); setSelectedQuestionIndex(0); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "unattempted"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Skipped ({unattempted_count})
            </button>

            <button
              type="button"
              onClick={() => { setFilter("correct"); setSelectedQuestionIndex(0); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "correct"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Correct ({attempt.correct_count})
            </button>

            <button
              type="button"
              onClick={() => { setFilter("incorrect"); setSelectedQuestionIndex(0); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === "incorrect"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Incorrect ({attempt.incorrect_count})
            </button>
          </div>

          {/* Subject Filter */}
          {subjectNames.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Subject:</span>
              <select
                value={selectedSubjectFilter}
                onChange={(e) => {
                  setSelectedSubjectFilter(e.target.value);
                  setSelectedQuestionIndex(0);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-[#2E3AE3]"
              >
                <option value="all">All Subjects</option>
                {subjectNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <p className="text-base font-bold text-slate-800">No questions match the selected filter.</p>
            <p className="mt-1 text-xs text-slate-500">Try changing the filter or subject selection.</p>
            <button
              type="button"
              onClick={() => { setFilter("all"); setSelectedSubjectFilter("all"); }}
              className="mt-4 rounded-xl bg-[#2E3AE3] px-4 py-2 text-xs font-bold text-white hover:bg-[#252fb8] shadow-md shadow-[#2E3AE3]/25"
            >
              View all questions
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Question Details (2 Cols Wide) */}
            <div className="lg:col-span-2 space-y-4">
              {currentQuestion && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xl bg-[#2E3AE3] px-3 py-1 text-xs font-black text-white shadow-xs">
                        Question {currentQuestion.display_order}
                      </span>
                      <span className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#2E3AE3] border border-[#2E3AE3]/20">
                        {currentQuestion.subject_name || "General"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentQuestion.is_correct && (
                        <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                          ✓ Correct (+{currentQuestion.marks})
                        </span>
                      )}
                      {!currentQuestion.is_correct && !currentQuestion.is_unanswered && (
                        <span className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-300">
                          ✗ Incorrect (-{currentQuestion.negative_marks})
                        </span>
                      )}
                      {currentQuestion.is_unanswered && (
                        <span className="rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                          ○ Skipped (0.00)
                        </span>
                      )}
                      <span
                        className={`rounded-lg border px-2.5 py-0.5 text-xs font-bold uppercase ${
                          difficultyColors[currentQuestion.difficulty] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mt-5 text-base sm:text-lg leading-relaxed text-[#1F2227] font-normal whitespace-pre-wrap">
                    {currentQuestion.question_text}
                  </div>

                  {/* Options with Detailed Highlights */}
                  <div className="mt-6 sm:mt-8 space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isStudentSelected = currentQuestion.selected_option_id === option.id;
                      const isCorrect = currentQuestion.correct_option_id === option.id;

                      let optionCardClass = "border-slate-200/90 bg-white text-slate-700";
                      let badgeClass = "border border-slate-300 bg-slate-100 text-slate-700";

                      if (isCorrect) {
                        optionCardClass = "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500 font-medium";
                        badgeClass = "bg-emerald-600 text-white font-bold";
                      } else if (isStudentSelected && !isCorrect) {
                        optionCardClass = "border-rose-400 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400";
                        badgeClass = "bg-rose-600 text-white font-bold";
                      }

                      return (
                        <div
                          key={option.id}
                          className={`flex items-start justify-between gap-3 rounded-2xl border-2 p-4 text-sm sm:text-base transition-all ${optionCardClass}`}
                        >
                          <div className="flex items-start gap-3.5">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs ${badgeClass}`}>
                              {option.option_label}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{option.option_text}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            {isCorrect && (
                              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                Correct ✓
                              </span>
                            )}
                            {isStudentSelected && !isCorrect && (
                              <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                                Your Choice ✗
                              </span>
                            )}
                            {isStudentSelected && isCorrect && (
                              <span className="rounded-lg bg-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-900">
                                (Your Answer)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Explanation / Solution Box */}
                  <div className="mt-8 rounded-2xl border border-blue-200 bg-[#EEF2FF]/60 p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-[#2E3AE3] font-black text-sm sm:text-base">
                      <span>💡 Detailed Explanation & Steps:</span>
                    </div>
                    <div className="mt-3 text-sm sm:text-base leading-relaxed text-[#1F2227] whitespace-pre-wrap font-normal">
                      {currentQuestion.explanation || "No explanation provided for this question."}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation in Review */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs">
                <button
                  type="button"
                  disabled={selectedQuestionIndex === 0}
                  onClick={() => setSelectedQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all"
                >
                  &larr; Previous
                </button>

                <span className="text-xs text-slate-500 font-bold">
                  Question {selectedQuestionIndex + 1} of {filteredQuestions.length}
                </span>

                <button
                  type="button"
                  disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
                  onClick={() => setSelectedQuestionIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-95 transition-all"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Questions Grid Palette (1 Col Wide) */}
            <div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sticky top-24">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1F2227]">
                  Questions Overview ({filteredQuestions.length})
                </h3>

                <div className="mt-4 grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredQuestions.map((q, idx) => {
                    const isSelected = idx === selectedQuestionIndex;
                    let btnClass = "border text-slate-700 bg-slate-100 border-slate-300";

                    if (q.is_correct) {
                      btnClass = "bg-emerald-600 text-white border-emerald-700 font-bold";
                    } else if (!q.is_unanswered) {
                      btnClass = "bg-rose-600 text-white border-rose-700 font-bold";
                    } else {
                      btnClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                    }

                    if (isSelected) {
                      btnClass += " ring-2 ring-[#2E3AE3] ring-offset-2 scale-105";
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs transition-all ${btnClass}`}
                        title={`Question ${q.display_order} (${q.subject_name || "General"})`}
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
                      <span className="text-slate-600 font-medium">Correct</span>
                    </div>
                    <span className="font-bold text-emerald-800">{attempt.correct_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-rose-600"></span>
                      <span className="text-slate-600 font-medium">Incorrect</span>
                    </div>
                    <span className="font-bold text-rose-700">{attempt.incorrect_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300"></span>
                      <span className="text-slate-600 font-medium">Skipped</span>
                    </div>
                    <span className="font-bold text-amber-800">{unattempted_count}</span>
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
