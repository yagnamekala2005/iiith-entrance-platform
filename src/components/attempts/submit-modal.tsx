"use client";

import React from "react";
import type { AttemptQuestionTaking } from "@/types/content";

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  questions: AttemptQuestionTaking[];
  timeRemainingFormatted?: string;
}

export function SubmitModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  questions,
  timeRemainingFormatted,
}: SubmitModalProps) {
  if (!isOpen) return null;

  const total = questions.length;
  const attempted = questions.filter((q) => Boolean(q.selected_option_id)).length;
  const notAttempted = total - attempted;
  const marked = questions.filter((q) => q.marked_for_review).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Confirm Exam Submission</h3>
            <p className="mt-1 text-xs text-slate-500">
              Please review your question attempt summary before final submission.
            </p>
          </div>
          {timeRemainingFormatted && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-right">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Remaining</span>
              <span className="font-mono text-sm font-bold text-blue-950">{timeRemainingFormatted}</span>
            </div>
          )}
        </div>

        {/* Prominent Attempted vs Not Attempted Breakdown */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Attempted
            </p>
            <p className="mt-1 text-3xl font-black text-blue-900">{attempted}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              {Math.round((attempted / (total || 1)) * 100)}% of total
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Not Attempted
            </p>
            <p className="mt-1 text-3xl font-black text-amber-700">{notAttempted}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              {Math.round((notAttempted / (total || 1)) * 100)}% skipped
            </p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-800">
              Marked Review
            </p>
            <p className="mt-1 text-3xl font-black text-purple-700">{marked}</p>
            <p className="text-[10px] text-purple-600 mt-0.5">Flagged</p>
          </div>
        </div>

        {/* Warning if unattempted */}
        {notAttempted > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold">You still have {notAttempted} unattempted questions!</p>
              <p className="mt-0.5 text-amber-700">
                You can return to the exam to answer them, or submit now if you are finished.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            ← Return to Test
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Scoring & Submitting..." : "Yes, Submit Final Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
