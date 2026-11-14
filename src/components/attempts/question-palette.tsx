"use client";

import React, { useState } from "react";
import type { AttemptQuestionTaking } from "@/types/content";

interface QuestionPaletteProps {
  questions: AttemptQuestionTaking[];
  currentIndex: number;
  currentSubject?: string;
  onSelectQuestion: (index: number) => void;
}

export function QuestionPalette({
  questions,
  currentIndex,
  onSelectQuestion,
}: QuestionPaletteProps) {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  // Extract unique subjects
  const subjectNames = Array.from(new Set(questions.map((q) => q.subject_name || "General")));

  // Filtered list
  const filteredIndexedQuestions = questions
    .map((q, idx) => ({ ...q, originalIndex: idx }))
    .filter((q) => {
      if (selectedSubjectFilter === "all") return true;
      return (q.subject_name || "General") === selectedSubjectFilter;
    });

  // Accurate Counts
  const answeredCount = questions.filter((q) => q.selected_option_id && !q.marked_for_review).length;
  const answeredAndMarkedCount = questions.filter((q) => q.selected_option_id && q.marked_for_review).length;
  const markedCount = questions.filter((q) => !q.selected_option_id && q.marked_for_review).length;
  const unattemptedCount = questions.filter((q) => !q.selected_option_id && !q.marked_for_review).length;
  const totalAttempted = answeredCount + answeredAndMarkedCount;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sticky top-28 space-y-4">
      {/* Palette Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1F2227]">
            Question Palette
          </h3>
          <p className="text-[11px] font-semibold text-slate-500">
            <span className="text-[#2E3AE3] font-black">{totalAttempted}</span> of {questions.length} Answered
          </p>
        </div>

        {/* Subject Filter Dropdown */}
        {subjectNames.length > 1 && (
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:border-[#2E3AE3]"
          >
            <option value="all">All Sections ({questions.length})</option>
            {subjectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Grid of Question Buttons */}
      <div className="max-h-[340px] overflow-y-auto pr-1">
        <div className="grid grid-cols-5 gap-2">
          {filteredIndexedQuestions.map((q) => {
            const isCurrent = q.originalIndex === currentIndex;
            const isAnswered = Boolean(q.selected_option_id);
            const isMarked = q.marked_for_review;

            let btnClasses = "border text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200";

            if (isAnswered && isMarked) {
              btnClasses = "bg-purple-600 text-white border-purple-800 shadow-xs font-bold";
            } else if (isMarked) {
              btnClasses = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
            } else if (isAnswered) {
              btnClasses = "bg-[#2E3AE3] text-white border-[#222CB8] font-bold shadow-xs";
            }

            if (isCurrent) {
              btnClasses += " ring-2 ring-[#2E3AE3] ring-offset-2 scale-105 font-black";
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQuestion(q.originalIndex)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs transition-all active:scale-95 ${btnClasses}`}
                title={`Question ${q.originalIndex + 1} (${q.subject_name || "General"})`}
              >
                {q.originalIndex + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Status Legend */}
      <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-[#2E3AE3] shrink-0" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-slate-200 shrink-0" />
          <span>Unanswered ({unattemptedCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-amber-200 border border-amber-400 shrink-0" />
          <span>Review ({markedCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-purple-600 shrink-0" />
          <span>Ans + Review ({answeredAndMarkedCount})</span>
        </div>
      </div>
    </div>
  );
}
