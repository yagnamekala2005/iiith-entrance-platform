"use client";

import React from "react";
import type { AttemptQuestionTaking } from "@/types/content";

interface QuestionPaletteProps {
  questions: AttemptQuestionTaking[];
  currentIndex: number;
  onSelectQuestion: (index: number) => void;
}

export function QuestionPalette({
  questions,
  currentIndex,
  onSelectQuestion,
}: QuestionPaletteProps) {
  // Count states
  const answeredCount = questions.filter((q) => q.selected_option_id && !q.marked_for_review).length;
  const answeredAndMarkedCount = questions.filter((q) => q.selected_option_id && q.marked_for_review).length;
  const markedCount = questions.filter((q) => !q.selected_option_id && q.marked_for_review).length;
  const unansweredCount = questions.filter((q) => !q.selected_option_id && !q.marked_for_review).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
        Question Palette
      </h3>

      {/* Grid of question buttons */}
      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = Boolean(q.selected_option_id);
          const isMarked = q.marked_for_review;

          let btnClasses = "border text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200";

          if (isAnswered && isMarked) {
            btnClasses = "bg-purple-700 text-white border-purple-900 shadow-xs ring-2 ring-purple-300";
          } else if (isMarked) {
            btnClasses = "bg-amber-100 text-amber-900 border-amber-400 font-semibold";
          } else if (isAnswered) {
            btnClasses = "bg-teal-700 text-white border-teal-800 font-semibold shadow-xs";
          }

          if (isCurrent) {
            btnClasses += " ring-2 ring-teal-500 ring-offset-2";
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`flex h-10 w-10 items-center justify-center rounded-md text-xs font-semibold transition-all ${btnClasses}`}
              title={`Question ${idx + 1} (${q.section_name || "General"})`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend & Stats */}
      <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-teal-700"></span>
            <span className="text-slate-600">Answered</span>
          </div>
          <span className="font-bold text-slate-900">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-slate-200 border border-slate-300"></span>
            <span className="text-slate-600">Unanswered</span>
          </div>
          <span className="font-bold text-slate-900">{unansweredCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-400"></span>
            <span className="text-slate-600">Marked for Review</span>
          </div>
          <span className="font-bold text-slate-900">{markedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded bg-purple-700"></span>
            <span className="text-slate-600">Answered & Marked</span>
          </div>
          <span className="font-bold text-slate-900">{answeredAndMarkedCount}</span>
        </div>
      </div>
    </div>
  );
}

