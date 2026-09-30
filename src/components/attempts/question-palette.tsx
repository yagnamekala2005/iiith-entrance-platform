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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sticky top-28">
      {/* Palette Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Question Palette
          </h3>
          <p className="text-[11px] font-semibold text-slate-500">
            <span className="text-blue-700 font-bold">{totalAttempted}</span> of {questions.length} Attempted
          </p>
        </div>

        {/* Subject Filter Dropdown */}
        {subjectNames.length > 1 && (
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
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
      <div className="mt-4 max-h-[340px] overflow-y-auto pr-1">
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
              btnClasses = "bg-blue-600 text-white border-blue-700 font-bold shadow-xs";
            }

            if (isCurrent) {
              btnClasses += " ring-2 ring-blue-500 ring-offset-2 scale-105 font-black";
            }

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelectQuestion(q.originalIndex)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs transition-all ${btnClasses}`}
                title={`Question ${q.originalIndex + 1} (${q.subject_name || "General"})`}
              >
                {q.originalIndex + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* CBT Legend & Real-Time Statistics */}
      <div className="mt-5 border-t border-slate-100 pt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-600"></span>
            <span className="text-slate-600 font-medium">Answered / Attempted</span>
          </div>
          <span className="font-bold text-blue-800">{answeredCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-slate-200 border border-slate-300"></span>
            <span className="text-slate-600 font-medium">Not Attempted</span>
          </div>
          <span className="font-bold text-slate-700">{unattemptedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-200 border border-amber-400"></span>
            <span className="text-slate-600 font-medium">Marked for Review</span>
          </div>
          <span className="font-bold text-amber-700">{markedCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-purple-600"></span>
            <span className="text-slate-600 font-medium">Answered & Marked</span>
          </div>
          <span className="font-bold text-purple-700">{answeredAndMarkedCount}</span>
        </div>
      </div>

      {/* Quick Summary Progress Bar */}
      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center text-xs">
        <span className="text-slate-500 font-medium">Exam Progress: </span>
        <strong className="text-blue-800 font-bold">
          {Math.round((totalAttempted / (questions.length || 1)) * 100)}% Answered
        </strong>
      </div>
    </div>
  );
}
