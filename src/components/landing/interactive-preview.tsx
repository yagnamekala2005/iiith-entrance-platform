"use client";

import React, { useState } from "react";
import Link from "next/link";

export function InteractiveExamPreview() {
  const [activeSubject, setActiveSubject] = useState<string>("Mathematics");
  const [selectedOption, setSelectedOption] = useState<string | null>("A");
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const sampleQuestions: Record<string, {
    q: string;
    options: { label: string; text: string }[];
    correct: string;
    explanation: string;
    difficulty: string;
    marks: string;
  }> = {
    Mathematics: {
      q: "If α and β are the roots of the quadratic equation x² - 6x + c = 0, and 3α + 2β = 20, find the numerical value of c.",
      options: [
        { label: "A", text: "-16" },
        { label: "B", text: "16" },
        { label: "C", text: "-12" },
        { label: "D", text: "8" },
      ],
      correct: "A",
      explanation: "From Vieta's formulas: α + β = 6. Given 3α + 2β = 20 ⟹ 2(α + β) + α = 20 ⟹ 12 + α = 20 ⟹ α = 8. Then β = 6 - 8 = -2. Therefore c = αβ = 8 × (-2) = -16.",
      difficulty: "Medium",
      marks: "+1.00 / -0.25",
    },
    Physics: {
      q: "A particle of mass m is projected with velocity v at an angle θ with the horizontal. What is the magnitude of angular momentum about the point of projection at the highest point of its trajectory?",
      options: [
        { label: "A", text: "(m v³ sin²θ cosθ) / (2g)" },
        { label: "B", text: "(m v³ sinθ cos²θ) / (2g)" },
        { label: "C", text: "(m v³ cosθ) / g" },
        { label: "D", text: "(m v³ sin³θ) / (2g)" },
      ],
      correct: "A",
      explanation: "At highest point, velocity is horizontal: v_x = v cosθ. Maximum height H = (v² sin²θ) / (2g). Angular momentum about projection point L = m × v_x × H = m (v cosθ) (v² sin²θ / 2g) = (m v³ sin²θ cosθ) / (2g).",
      difficulty: "Hard",
      marks: "+1.00 / -0.25",
    },
    Chemistry: {
      q: "For a first-order reaction A → Products, the time taken for 75% completion is t₁. The time taken for 87.5% completion is t₂. What is the ratio t₂ / t₁?",
      options: [
        { label: "A", text: "1.5" },
        { label: "B", text: "2.0" },
        { label: "C", text: "1.25" },
        { label: "D", text: "1.75" },
      ],
      correct: "A",
      explanation: "75% completion corresponds to 2 half-lives (t₁ = 2 × t_half). 87.5% completion corresponds to 3 half-lives (t₂ = 3 × t_half). Thus t₂ / t₁ = 3 / 2 = 1.5.",
      difficulty: "Easy",
      marks: "+1.00 / -0.25",
    },
    "Aptitude & Reasoning": {
      q: "In a certain code language, if 'TRIANGLE' is coded as 'SQHZMFKD', how will 'RESEARCH' be coded in the same language?",
      options: [
        { label: "A", text: "QDSDZQBG" },
        { label: "B", text: "QDRDBQBG" },
        { label: "C", text: "SDTDZQDG" },
        { label: "D", text: "QFRFBQBG" },
      ],
      correct: "A",
      explanation: "Each letter is shifted backward by 1 position: T-1=S, R-1=Q, I-1=H, A-1=Z, N-1=M, G-1=F, L-1=K, E-1=D. For RESEARCH: R-1=Q, E-1=D, S-1=R... wait, S-1=R, E-1=D, A-1=Z, R-1=Q, C-1=B, H-1=G. Hence QDSDZQBG.",
      difficulty: "Medium",
      marks: "+1.00 / -0.25",
    },
  };

  const currentQ = sampleQuestions[activeSubject] || sampleQuestions["Mathematics"];

  return (
    <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 sm:p-6 shadow-2xl text-white backdrop-blur-md overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>

      {/* Top simulated exam header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping"></span>
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">
            LIVE SIMULATION DEMO
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            IIITH UGEE (SUPR + REAP)
          </span>
        </div>

        {/* Live synchronized countdown preview */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-xs font-bold text-amber-300">
          <span>⏱️ Time Left:</span>
          <span>02:54:18</span>
        </div>
      </div>

      {/* Subject switcher tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.keys(sampleQuestions).map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => {
              setActiveSubject(subject);
              setSelectedOption("A");
              setShowExplanation(false);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeSubject === subject
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {subject === "Mathematics" && "📐 "}
            {subject === "Physics" && "⚡ "}
            {subject === "Chemistry" && "🧪 "}
            {subject === "Aptitude & Reasoning" && "🧠 "}
            {subject}
          </button>
        ))}
      </div>

      {/* Question Card Preview */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-900/60 border border-blue-700 px-2 py-0.5 font-bold text-blue-300">
              Question 1
            </span>
            <span className="text-slate-400 font-medium">{activeSubject} Section</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
              {currentQ.difficulty}
            </span>
            <span className="text-slate-400 font-mono">{currentQ.marks}</span>
          </div>
        </div>

        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-200 font-normal">
          {currentQ.q}
        </p>

        {/* Option buttons */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOption === opt.label;
            const isCorrect = opt.label === currentQ.correct;

            let btnStyle = "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80";
            if (showExplanation) {
              if (isCorrect) {
                btnStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500";
              } else if (isSelected && !isCorrect) {
                btnStyle = "border-rose-500 bg-rose-950/40 text-rose-200 ring-1 ring-rose-500";
              }
            } else if (isSelected) {
              btnStyle = "border-blue-500 bg-blue-950/50 text-blue-200 ring-1 ring-blue-500";
            }

            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedOption(opt.label)}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs transition-all ${btnStyle}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold">
                  {opt.label}
                </span>
                <span className="pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive toggle */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <span>💡 {showExplanation ? "Hide Solution" : "Verify Answer & Explanation"}</span>
          </button>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Status: <span className="text-emerald-400 font-semibold">Answered (Attempted)</span>
          </span>
        </div>

        {/* Explanation box */}
        {showExplanation && (
          <div className="mt-3 rounded-lg border border-blue-900/60 bg-blue-950/40 p-3 text-xs text-blue-200 leading-relaxed animate-in fade-in">
            <strong className="text-blue-300">Solution: </strong>
            {currentQ.explanation}
          </div>
        )}
      </div>

      {/* Palette preview and CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">Palette:</span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> 1 Attempted
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-600"></span> 39 Left
          </span>
        </div>

        <Link
          href="/register"
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-all"
        >
          Launch Real Exam &rarr;
        </Link>
      </div>
    </div>
  );
}

