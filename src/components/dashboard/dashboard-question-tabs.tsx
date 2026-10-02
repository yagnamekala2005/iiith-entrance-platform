"use client";

import React, { useState } from "react";
import type { QuestionWithDetails } from "@/types/content";
import Link from "next/link";

interface DashboardQuestionTabsProps {
  questions: QuestionWithDetails[];
}

export function DashboardQuestionTabs({ questions }: DashboardQuestionTabsProps) {
  const [activeSubject, setActiveSubject] = useState<string>("Mathematics");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Core 4 subjects
  const coreSubjects = [
    { name: "Mathematics", icon: "📐", color: "text-blue-700 bg-blue-50 border-blue-200" },
    { name: "Physics", icon: "⚡", color: "text-amber-700 bg-amber-50 border-amber-200" },
    { name: "Chemistry", icon: "🧪", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { name: "Aptitude & Reasoning", icon: "🧠", color: "text-purple-700 bg-purple-50 border-purple-200" },
  ];

  // Filter questions for active subject
  const subjectQuestions = questions.filter(
    (q) => (q.subject?.name || "Mathematics") === activeSubject
  );

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const toggleExplanation = (questionId: string) => {
    setRevealedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
          📝
        </div>
        <h3 className="mt-4 text-xl font-bold text-slate-900">
          Interactive Practice Questions
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Questions will appear here automatically when an administrator authors and publishes a mock test.
        </p>
        <div className="mt-5">
          <Link
            href="/tests"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
          >
            <span>View Available Mock Tests</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
              Interactive Practice
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 font-semibold">4 Subjects Covered</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Practice by Subject
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Directly test yourself with curated questions across Mathematics, Physics, Chemistry, and Aptitude.
          </p>
        </div>

        <Link
          href="/tests"
          className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
        >
          Launch Timed Mock Exam &rarr;
        </Link>
      </div>

      {/* 4 Subject Tabs (Scrollable on Mobile) */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {coreSubjects.map((sub) => {
          const count = questions.filter((q) => (q.subject?.name || "Mathematics") === sub.name).length;
          const isActive = activeSubject === sub.name;

          return (
            <button
              key={sub.name}
              type="button"
              onClick={() => setActiveSubject(sub.name)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-700 text-white shadow-sm ring-2 ring-blue-700 ring-offset-2"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                  isActive ? "bg-blue-900 text-blue-200" : "bg-slate-200 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Questions list for active subject */}
      <div className="mt-6 space-y-6">
        {subjectQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No questions loaded for {activeSubject} yet.
          </div>
        ) : (
          subjectQuestions.slice(0, 6).map((q, idx) => {
            const selectedOptId = selectedAnswers[q.id];
            const isExplanationOpen = Boolean(revealedExplanations[q.id]);

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 transition-all hover:border-slate-300 hover:shadow-sm"
              >
                {/* Question metadata header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-700 px-2.5 py-0.5 text-xs font-black text-white">
                      Q{idx + 1}
                    </span>
                    {q.topic && (
                      <span className="rounded bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {q.topic.name}
                      </span>
                    )}
                    {q.chapter && (
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        &bull; {q.chapter.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded border bg-slate-50 px-2 py-0.5 font-bold text-slate-600 uppercase text-[10px]">
                      {q.difficulty}
                    </span>
                    <span className="font-semibold text-slate-500 font-mono">
                      +{q.marks} / -{q.negative_marks}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <div className="mt-4 text-base sm:text-lg font-normal leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {q.question_text}
                </div>

                {/* Options */}
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {q.options.map((opt) => {
                    const isSelected = selectedOptId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition-all min-h-[48px] ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-600/50 shadow-xs font-medium"
                            : "border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected ? "bg-blue-700 text-white" : "bg-white text-slate-600 border border-slate-300"
                          }`}
                        >
                          {opt.option_label}
                        </span>
                        <span className="pt-0.5 leading-relaxed">{opt.option_text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleExplanation(q.id)}
                    className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
                  >
                    <span>💡 {isExplanationOpen ? "Hide Solution" : "View Explanation & Solution"}</span>
                  </button>

                  {selectedOptId && (
                    <button
                      type="button"
                      onClick={() => handleSelectOption(q.id, "")}
                      className="font-medium text-slate-400 hover:text-slate-600"
                    >
                      Clear response
                    </button>
                  )}
                </div>

                {/* Explanation Drawer */}
                {isExplanationOpen && q.explanation && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs sm:text-sm text-slate-800 animate-in fade-in duration-150">
                    <p className="font-bold text-blue-900 mb-1">Detailed Explanation & Solution:</p>
                    <p className="leading-relaxed whitespace-pre-wrap font-normal text-slate-700">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {subjectQuestions.length > 6 && (
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <Link
            href="/practice"
            className="text-xs font-bold uppercase tracking-wider text-blue-700 hover:text-blue-900"
          >
            Explore all {subjectQuestions.length} {activeSubject} practice questions &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
