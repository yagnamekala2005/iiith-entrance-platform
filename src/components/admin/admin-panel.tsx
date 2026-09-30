"use client";

import React, { useState, useTransition } from "react";
import { createAdminQuestion, deleteAdminQuestion, addAdminUserByEmail } from "@/lib/admin/actions";
import Link from "next/link";

interface SubjectItem {
  id: string;
  name: string;
  slug: string;
}

interface ChapterItem {
  id: string;
  name: string;
  subject_id: string;
}

interface TopicItem {
  id: string;
  name: string;
  chapter_id: string;
}

interface ExamItem {
  id: string;
  name: string;
  slug: string;
}

interface TestItem {
  id: string;
  name: string;
  slug: string;
}

interface QuestionAdminItem {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  subject?: { id: string; name: string } | null;
  options: { id: string; option_label: string; option_text: string }[];
  answer_key?: { correct_option_id: string }[] | null;
}

interface AdminPanelProps {
  currentAdminEmail: string;
  subjects: SubjectItem[];
  chapters: ChapterItem[];
  topics: TopicItem[];
  exams: ExamItem[];
  tests: TestItem[];
  initialQuestions: QuestionAdminItem[];
  adminUsersList: { user_id: string; email: string }[];
}

export function AdminPanel({
  currentAdminEmail,
  subjects,
  chapters,
  topics,
  exams,
  tests,
  initialQuestions,
  adminUsersList,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"create" | "list" | "admins">("create");
  const [isPending, startTransition] = useTransition();

  // Create Question Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || "");
  const [questionText, setQuestionText] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [marks, setMarks] = useState<number>(1);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [options, setOptions] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [correctOptionLabel, setCorrectOptionLabel] = useState<string>("A");
  const [explanation, setExplanation] = useState<string>("");
  const [selectedTests, setSelectedTests] = useState<string[]>(tests.map((t) => t.id)); // Default checked

  // Form alerts
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Questions List State
  const [questions, setQuestions] = useState<QuestionAdminItem[]>(initialQuestions);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Admin enrollment
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [adminEnrollMsg, setAdminEnrollMsg] = useState<string>("");

  // Chapters filtered by subject
  const filteredChapters = chapters.filter((c) => c.subject_id === selectedSubjectId);
  // Topics filtered by chapter
  const filteredTopics = topics.filter((t) => t.chapter_id === selectedChapterId);

  // Handle Option change
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options] as [string, string, string, string];
    updated[index] = value;
    setOptions(updated);
  };

  // Submit Question Creation
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!questionText.trim()) {
      setErrorMessage("Please enter question text.");
      return;
    }

    if (options.some((opt) => !opt.trim())) {
      setErrorMessage("Please enter all 4 options (A, B, C, D).");
      return;
    }

    if (!explanation.trim()) {
      setErrorMessage("Please provide a detailed explanation for this question.");
      return;
    }

    startTransition(async () => {
      const payload = {
        subject_id: selectedSubjectId,
        chapter_id: selectedChapterId || null,
        topic_id: selectedTopicId || null,
        exam_id: selectedExamId || null,
        question_text: questionText.trim(),
        difficulty,
        explanation: explanation.trim(),
        marks: Number(marks),
        negative_marks: Number(negativeMarks),
        options: [
          { label: "A", text: options[0].trim() },
          { label: "B", text: options[1].trim() },
          { label: "C", text: options[2].trim() },
          { label: "D", text: options[3].trim() },
        ],
        correct_option_label: correctOptionLabel,
        add_to_test_ids: selectedTests,
      };

      const res = await createAdminQuestion(payload);

      if (res.success) {
        setSuccessMessage("✅ Question, options, and explanation saved successfully and linked to mock tests!");
        setQuestionText("");
        setOptions(["", "", "", ""]);
        setExplanation("");

        // Optimistically add to questions list
        const newQItem: QuestionAdminItem = {
          id: res.questionId || String(Date.now()),
          question_text: payload.question_text,
          difficulty: payload.difficulty,
          marks: payload.marks,
          negative_marks: payload.negative_marks,
          explanation: payload.explanation,
          subject: subjects.find((s) => s.id === payload.subject_id),
          options: payload.options.map((o) => ({ id: o.label, option_label: o.label, option_text: o.text })),
        };
        setQuestions((prev) => [newQItem, ...prev]);
      } else {
        setErrorMessage(res.error || "Failed to create question.");
      }
    });
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    startTransition(async () => {
      const res = await deleteAdminQuestion(questionId);
      if (res.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        alert(res.error || "Failed to delete question.");
      }
    });
  };

  // Add new admin user
  const handleEnrollAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    startTransition(async () => {
      const res = await addAdminUserByEmail(newAdminEmail);
      if (res.success) {
        setAdminEnrollMsg(`✅ Successfully granted admin role to ${res.email}`);
        setNewAdminEmail("");
      } else {
        setAdminEnrollMsg(`❌ ${res.error}`);
      }
    });
  };

  // Filter questions in list
  const displayedQuestions = questions.filter((q) => {
    if (subjectFilter !== "all" && q.subject?.id !== subjectFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      return (
        q.question_text.toLowerCase().includes(qLower) ||
        (q.explanation && q.explanation.toLowerCase().includes(qLower))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white px-6 py-4 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xs">
              ADMIN CONTROL
            </span>
            <span className="text-base sm:text-lg font-bold tracking-tight">
              IIITH Mock Test Management Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-300 hidden sm:block">
              Admin: <strong className="text-sky-300">{currentAdminEmail}</strong>
            </span>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold uppercase text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
            >
              &rarr; Student Test View
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "create"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>➕ Add New Question</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "list"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>📚 Question Bank ({questions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("admins")}
              className={`rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "admins"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>👥 Admin Roles</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Core Subjects: <strong>Maths, Physics, Chemistry, Aptitude</strong></span>
          </div>
        </div>

        {/* TAB 1: ADD QUESTION STUDIO */}
        {activeTab === "create" && (
          <div className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="border-b border-slate-100 pb-5">
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                  Question Authoring Studio
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  Add Question, 4 Options & Detailed Explanation
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Fill in the details below. As an admin, newly added questions will be immediately saved with verified answer keys and linked to active mock tests.
                </p>
              </div>

              {/* Status messages */}
              {successMessage && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <span>⚠️ {errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateQuestion} className="mt-6 space-y-6">
                {/* 1. Subject & Exam Selection */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Subject *
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedChapterId("");
                        setSelectedTopicId("");
                      }}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                      required
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Chapter (Optional)
                    </label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setSelectedTopicId("");
                      }}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      <option value="">-- Select Chapter --</option>
                      {filteredChapters.map((chap) => (
                        <option key={chap.id} value={chap.id}>
                          {chap.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Target Exam Track
                    </label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.name} ({ex.slug.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Difficulty & Marks */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Positive Marks
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.5"
                      value={marks}
                      onChange={(e) => setMarks(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Negative Marks (Deduction)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                {/* 3. Question Statement */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Question Statement *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    Supports plain text, LaTeX math formulas (e.g. $x^2 + y^2 = r^2$), and multiline formatting.
                  </p>
                  <textarea
                    rows={4}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the full question text here..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm sm:text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* 4. Four Options & Correct Answer Radio */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      4 Multiple Choice Options (Select the Correct Option) *
                    </label>
                    <span className="text-xs text-slate-500">Click radio button to set correct answer</span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((label, idx) => {
                      const isCorrect = correctOptionLabel === label;
                      return (
                        <div
                          key={label}
                          className={`rounded-xl border p-3.5 transition-all flex items-start gap-3 ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/50"
                              : "border-slate-300 bg-white hover:border-slate-400"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer pt-2 shrink-0">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={isCorrect}
                              onChange={() => setCorrectOptionLabel(label)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                                isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {label}
                            </span>
                          </label>

                          <div className="flex-1">
                            <input
                              type="text"
                              value={options[idx]}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              placeholder={`Option ${label} text...`}
                              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-800 outline-none focus:border-blue-600"
                              required
                            />
                            {isCorrect && (
                              <p className="mt-1 text-[11px] font-bold text-emerald-700">
                                ✓ Marked as Correct Answer
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Detailed Step-by-Step Explanation */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Step-by-Step Explanation & Solution *
                  </label>
                  <p className="text-[11px] text-slate-500 mb-1">
                    This explanation will be shown to students on their scorecard review page after they submit the mock test.
                  </p>
                  <textarea
                    rows={4}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Enter the complete solution derivation, conceptual explanation, and step-by-step resolution..."
                    className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm sm:text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* 6. Link to Active Mock Tests */}
                {tests.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Automatically Include in Active Mock Tests:
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {tests.map((t) => {
                        const isChecked = selectedTests.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTests((prev) => [...prev, t.id]);
                                } else {
                                  setSelectedTests((prev) => prev.filter((id) => id !== t.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-blue-700 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {isPending ? "Saving Question..." : "Save Question & Publish →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION BANK MANAGEMENT */}
        {activeTab === "list" && (
          <div className="mt-6 space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500 mr-1">Subject:</span>
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    subjectFilter === "all"
                      ? "bg-blue-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  All ({questions.length})
                </button>
                {subjects.map((sub) => {
                  const count = questions.filter((q) => q.subject?.id === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubjectFilter(sub.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        subjectFilter === sub.id
                          ? "bg-blue-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {sub.name} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search question text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Questions List */}
            {displayedQuestions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <p className="text-base font-bold text-slate-700">No questions found matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedQuestions.map((q, idx) => {
                  const correctOption = q.options.find(
                    (o) => o.id === q.answer_key?.[0]?.correct_option_id
                  );

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-900 px-2.5 py-0.5 text-xs font-black text-white">
                            #{idx + 1}
                          </span>
                          <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                            {q.subject?.name || "General"}
                          </span>
                          <span className="rounded border px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                            {q.difficulty}
                          </span>
                          <span className="text-xs text-slate-500">
                            +{q.marks} / -{q.negative_marks} marks
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="mt-4 text-base font-normal leading-relaxed text-slate-900 whitespace-pre-wrap">
                        {q.question_text}
                      </div>

                      {/* Options */}
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt) => {
                          const isCorrect = opt.id === q.answer_key?.[0]?.correct_option_id;
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${
                                isCorrect
                                  ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-950"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                                  isCorrect ? "bg-emerald-600 text-white font-bold" : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {opt.option_label}
                              </span>
                              <span className="pt-0.5">{opt.option_text}</span>
                              {isCorrect && (
                                <span className="ml-auto text-[10px] text-emerald-700 font-bold">
                                  ✓ Correct Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs text-slate-800">
                          <strong className="text-blue-950">💡 Explanation: </strong>
                          <span className="whitespace-pre-wrap leading-relaxed">{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN USERS ROLES */}
        {activeTab === "admins" && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl font-bold text-slate-900">Platform Administrators</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                These users have authorized permissions to add questions, options, verify answer keys, and manage entrance mock tests.
              </p>

              {/* Add New Admin Form */}
              <form onSubmit={handleEnrollAdmin} className="mt-6 flex flex-wrap items-center gap-3">
                <input
                  type="email"
                  placeholder="Enter user email to grant admin..."
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full sm:w-80 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-blue-600"
                  required
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
                >
                  {isPending ? "Adding..." : "+ Grant Admin Role"}
                </button>
              </form>

              {adminEnrollMsg && (
                <p className="mt-3 text-xs font-semibold text-slate-700">{adminEnrollMsg}</p>
              )}

              {/* Current Admins List */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Current Active Administrators ({adminUsersList.length}):
                </h3>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50">
                  {adminUsersList.map((admin) => (
                    <div key={admin.user_id} className="flex items-center justify-between p-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <strong className="text-slate-900">{admin.email}</strong>
                        {admin.email === currentAdminEmail && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                            You (Active)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Admin Role
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

