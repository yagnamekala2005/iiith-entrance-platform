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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#1F2227] tracking-tight">
              Submit Live CBT Exam?
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              Review your question attempt breakdown before final submission.
            </p>
          </div>
          {timeRemainingFormatted && (
            <div className="rounded-2xl bg-[#EEF2FF] border border-[#2E3AE3]/20 px-3 py-1.5 text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-[#2E3AE3] block">Time Left</span>
              <span className="font-mono text-sm font-black text-[#2E3AE3]">{timeRemainingFormatted}</span>
            </div>
          )}
        </div>

        {/* 3 Prominent Stat Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800">
              Attempted
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-blue-900">{attempted}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              {Math.round((attempted / (total || 1)) * 100)}% of exam
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">
              Unanswered
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-800">{notAttempted}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              {Math.round((notAttempted / (total || 1)) * 100)}% skipped
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-800">
              Flagged
            </p>
            <p className="mt-1 text-2xl sm:text-3xl font-black text-purple-700">{marked}</p>
            <p className="text-[10px] text-purple-600 mt-0.5">For review</p>
          </div>
        </div>

        {/* Warning if unattempted */}
        {notAttempted > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="font-bold">You have {notAttempted} unattempted questions!</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed font-medium">
                You can return to the test to answer them, or confirm now to submit and grade your responses.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 active:scale-95 disabled:opacity-50 transition-all text-center order-2 sm:order-1"
          >
            Keep Writing Exam
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50 transition-all text-center order-1 sm:order-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Grading Answers...</span>
              </>
            ) : (
              <span>Confirm & Submit Exam</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
