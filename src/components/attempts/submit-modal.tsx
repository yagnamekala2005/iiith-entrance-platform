"use client";

import React from "react";
import type { AttemptQuestionTaking } from "@/types/content";

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  questions: AttemptQuestionTaking[];
}

export function SubmitModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  questions,
}: SubmitModalProps) {
  if (!isOpen) return null;

  const total = questions.length;
  const answered = questions.filter((q) => Boolean(q.selected_option_id)).length;
  const unanswered = total - answered;
  const marked = questions.filter((q) => q.marked_for_review).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-xl font-bold text-slate-900">Submit Test?</h3>
        <p className="mt-2 text-sm text-slate-600">
          Are you sure you want to submit your test? Once submitted, your answers cannot be modified.
        </p>

        {/* Summary stats */}
        <div className="mt-5 grid grid-cols-3 gap-3 rounded-md bg-slate-50 p-4 text-center border border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Answered</p>
            <p className="mt-1 text-xl font-bold text-teal-700">{answered}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Unanswered</p>
            <p className="mt-1 text-xl font-bold text-slate-600">{unanswered}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Marked</p>
            <p className="mt-1 text-xl font-bold text-amber-600">{marked}</p>
          </div>
        </div>

        {unanswered > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            ⚠️ You have <strong>{unanswered} unanswered</strong> {unanswered === 1 ? "question" : "questions"}.
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Return to Test
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
          >
            {isSubmitting ? "Scoring Test..." : "Yes, Submit Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

