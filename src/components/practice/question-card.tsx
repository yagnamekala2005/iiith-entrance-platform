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
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="border border-slate-200 bg-white p-6 transition-all hover:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
            Q{index + 1}
          </span>
          {question.section && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {question.section.name}
            </span>
          )}
          {question.topic && (
            <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
              {question.topic.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
              difficultyColors[question.difficulty] || "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {question.difficulty}
          </span>
          <span className="text-xs font-medium text-slate-500">
            +{question.marks} / -{question.negative_marks}
          </span>
        </div>
      </div>

      <div className="mt-5 text-base font-normal leading-relaxed text-slate-900 whitespace-pre-wrap">
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
              className={`flex w-full items-start gap-3 rounded-md border p-3.5 text-left text-sm transition-all ${
                isSelected
                  ? "border-teal-600 bg-teal-50/50 text-teal-950 ring-1 ring-teal-600"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isSelected
                    ? "bg-teal-700 text-white"
                    : "border border-slate-300 bg-slate-100 text-slate-700"
                }`}
              >
                {option.option_label}
              </span>
              <span className="pt-0.5 leading-snug">{option.option_text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-xs font-semibold uppercase tracking-wider text-teal-700 hover:text-teal-900"
        >
          {showExplanation ? "Hide Explanation" : "View Explanation & Steps"}
        </button>

        {selectedOptionId && (
          <button
            type="button"
            onClick={() => setSelectedOptionId(null)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Clear selection
          </button>
        )}
      </div>

      {showExplanation && question.explanation && (
        <div className="mt-4 rounded-md border border-teal-100 bg-teal-50/40 p-4 text-sm text-slate-800">
          <p className="font-semibold text-teal-900">Explanation:</p>
          <p className="mt-1 leading-relaxed whitespace-pre-wrap">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

