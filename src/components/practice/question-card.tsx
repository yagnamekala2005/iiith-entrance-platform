"use client";

import { useState } from "react";
import type { QuestionWithDetails } from "@/types/content";

interface QuestionCardProps {
  question: QuestionWithDetails;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const difficultyColors = {
    easy: "bg-emerald-50 text-emerald-800 border-emerald-200",
    medium: "bg-amber-50 text-amber-800 border-amber-200",
    hard: "bg-rose-50 text-rose-800 border-rose-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
            Question {index + 1}
          </span>
          {question.section && (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              {question.section.name}
            </span>
          )}
          {question.topic && (
            <span className="rounded-md bg-blue-50/60 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
              {question.topic.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
              difficultyColors[question.difficulty] || "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {question.difficulty}
          </span>
          <span className="rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
            +{question.marks} / -{question.negative_marks}
          </span>
        </div>
      </div>

      <div className="mt-5 text-base sm:text-lg font-medium leading-relaxed text-slate-900 whitespace-pre-wrap">
        {question.question_text}
      </div>

      <div className="mt-6 space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOptionId(option.id)}
              className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left text-sm font-medium transition-all ${
                isSelected
                  ? "border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-600 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/70"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black uppercase transition-all ${
                  isSelected
                    ? "bg-blue-700 text-white shadow-xs"
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100/60 transition-all flex items-center gap-1.5"
        >
          <span>💡</span>
          <span>{showExplanation ? "Hide Explanation" : "View Step-by-Step Solution"}</span>
        </button>

        {selectedOptionId && (
          <button
            type="button"
            onClick={() => setSelectedOptionId(null)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {showExplanation && question.explanation && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-5 text-sm text-slate-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">📝</span>
            <p className="font-extrabold text-blue-950">Step-by-Step Solution & Concept:</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 pl-6 border-l-2 border-blue-400">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

