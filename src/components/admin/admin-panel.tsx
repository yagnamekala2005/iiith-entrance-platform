"use client";

import React, { useState, useTransition } from "react";
import {
  createAdminQuestion,
  deleteAdminQuestion,
  addAdminUserByEmail,
  createAdminMockTest,
  deleteAdminMockTest,
  publishAdminMockTest,
} from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/client";

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
  duration_seconds?: number;
  test_type?: string;
  exam_id?: string;
  description?: string;
  status?: string;
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
  // Primary workflow: Mock Tests first -> Add Question -> Question Bank -> Admin Roles
  const [activeTab, setActiveTab] = useState<"tests" | "create" | "list" | "admins">("tests");
  const [isPending, startTransition] = useTransition();

  // Mock Tests State
  const [mockTests, setMockTests] = useState<TestItem[]>(tests);
  const [selectedTargetTestId, setSelectedTargetTestId] = useState<string>(tests[0]?.id || "");
  const [isCreatingMockTest, setIsCreatingMockTest] = useState<boolean>(false);
  const [newTestName, setNewTestName] = useState<string>("");
  const [newTestExamId, setNewTestExamId] = useState<string>(exams[0]?.id || "");
  const [newTestDuration, setNewTestDuration] = useState<number>(180);
  const [newTestDescription, setNewTestDescription] = useState<string>("");
  const [testSuccessMessage, setTestSuccessMessage] = useState<string>("");
  const [testErrorMessage, setTestErrorMessage] = useState<string>("");

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

  // Question Form alerts
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Questions List State
  const [questions, setQuestions] = useState<QuestionAdminItem[]>(initialQuestions);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Admin enrollment
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [adminEnrollMsg, setAdminEnrollMsg] = useState<string>("");

  // Filtered chapters & topics
  const filteredChapters = chapters.filter((c) => c.subject_id === selectedSubjectId);
  const filteredTopics = topics.filter((t) => t.chapter_id === selectedChapterId);

  // Selected mock test details
  const currentTargetTest = mockTests.find((t) => t.id === selectedTargetTestId) || mockTests[0];

  // Sign out handler
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login?role=admin";
  };

  // Handle Option change
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options] as [string, string, string, string];
    updated[index] = value;
    setOptions(updated);
  };

  // Handler: Create Mock Test
  const handleCreateMockTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestErrorMessage("");
    setTestSuccessMessage("");

    if (!newTestName.trim()) {
      setTestErrorMessage("Please enter a mock test title.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminMockTest({
        name: newTestName.trim(),
        exam_id: newTestExamId,
        duration_minutes: Number(newTestDuration),
        description: newTestDescription.trim(),
      });

      if (res.success && res.test) {
        setTestSuccessMessage(`✅ Mock Test "${res.test.name}" created successfully!`);
        const created: TestItem = {
          id: res.test.id,
          name: res.test.name,
          slug: res.test.slug,
          duration_seconds: res.test.duration_seconds,
          test_type: res.test.test_type,
          exam_id: res.test.exam_id,
          description: newTestDescription.trim(),
        };
        setMockTests((prev) => [created, ...prev]);
        setSelectedTargetTestId(res.test.id);
        setIsCreatingMockTest(false);
        setNewTestName("");
        setNewTestDescription("");
      } else {
        setTestErrorMessage(res.error || "Failed to create mock test.");
      }
    });
  };

  // Handler: Submit Question Creation
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!questionText.trim()) {
      setErrorMessage("Please enter the question statement.");
      return;
    }

    if (options.some((opt) => !opt.trim())) {
      setErrorMessage("Please enter all 4 options (A, B, C, D).");
      return;
    }

    if (!explanation.trim()) {
      setErrorMessage("Please provide a detailed step-by-step explanation for this question.");
      return;
    }

    if (!selectedTargetTestId) {
      setErrorMessage("Please select a target mock test to add this question to.");
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
        add_to_test_ids: [selectedTargetTestId],
      };

      const res = await createAdminQuestion(payload);

      if (res.success) {
        setSuccessMessage(
          `✅ Question saved successfully into "${currentTargetTest?.name || "Mock Test"}"! Click "➕ Add Question" to enter another, or "🚀 Publish" to finalize.`
        );
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

  // Handler: Add Question (clear/reset inputs for next question)
  const handleResetForNewQuestion = () => {
    if (questionText.trim() && !confirm("Clear question form to start authoring a new question?")) {
      return;
    }
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setExplanation("");
    setCorrectOptionLabel("A");
    setMarks(1);
    setNegativeMarks(0.25);
    setErrorMessage("");
    setSuccessMessage(
      `✨ Ready to author a new question for "${currentTargetTest?.name || "Mock Test"}". Enter details and click "Save".`
    );
  };

  // Handler: Publish Mock Test
  const handlePublishMockTest = async () => {
    if (!selectedTargetTestId) {
      setErrorMessage("Please select a target mock test to publish.");
      return;
    }

    const testToPublish = mockTests.find((t) => t.id === selectedTargetTestId);
    const testName = testToPublish?.name || "Mock Test";

    startTransition(async () => {
      // If user currently has question text typed in, save it first before publishing
      if (questionText.trim()) {
        if (options.some((opt) => !opt.trim())) {
          setErrorMessage("Please fill all 4 options before publishing, or clear question fields.");
          return;
        }
        if (!explanation.trim()) {
          setErrorMessage("Please provide explanation before saving & publishing, or clear question fields.");
          return;
        }

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
          add_to_test_ids: [selectedTargetTestId],
        };

        const qRes = await createAdminQuestion(payload);
        if (!qRes.success) {
          setErrorMessage(qRes.error || "Failed to save question before publishing.");
          return;
        }

        const newQItem: QuestionAdminItem = {
          id: qRes.questionId || String(Date.now()),
          question_text: payload.question_text,
          difficulty: payload.difficulty,
          marks: payload.marks,
          negative_marks: payload.negative_marks,
          explanation: payload.explanation,
          subject: subjects.find((s) => s.id === payload.subject_id),
          options: payload.options.map((o) => ({ id: o.label, option_label: o.label, option_text: o.text })),
        };
        setQuestions((prev) => [newQItem, ...prev]);
        setQuestionText("");
        setOptions(["", "", "", ""]);
        setExplanation("");
      }

      const res = await publishAdminMockTest(selectedTargetTestId);
      if (res.success) {
        setMockTests((prev) =>
          prev.map((t) => (t.id === selectedTargetTestId ? { ...t, status: "published" } : t))
        );
        setSuccessMessage(
          `🚀 Mock Test "${testName}" has been successfully PUBLISHED and is now live for students to take!`
        );
      } else {
        setErrorMessage(res.error || "Failed to publish mock test.");
      }
    });
  };

  // Handler: Delete Mock Test
  const handleDeleteMockTest = async (testId: string, testName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete mock test "${testName}"?\n\nThis will remove the mock test, its questions association, and test sections.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAdminMockTest(testId);
      if (res.success) {
        setTestSuccessMessage(`🗑️ Mock Test "${testName}" was deleted successfully.`);
        setMockTests((prev) => {
          const remaining = prev.filter((t) => t.id !== testId);
          if (selectedTargetTestId === testId) {
            setSelectedTargetTestId(remaining[0]?.id || "");
          }
          return remaining;
        });
      } else {
        setTestErrorMessage(res.error || "Failed to delete mock test.");
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

  // Filter questions in question bank
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
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white px-4 sm:px-8 py-3.5 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xs">
              ADMIN CONTROL
            </span>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight block">
                IIITH Entrance Management Portal
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block">
                Administrator Studio & Question Authoring
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 hidden md:block">
              Logged in: <strong className="text-sky-300">{currentAdminEmail}</strong>
            </span>

            {/* Small Sign Out Button (Requirement 3) */}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-rose-900/60 hover:border-rose-700 hover:text-white transition-all flex items-center gap-1.5 shadow-xs"
              title="Sign out of Admin Session"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="mx-auto max-w-7xl w-full flex-1 px-4 py-8 sm:px-6">
        {/* Navigation Tabs: Mock Tests -> Add Question -> Question Bank -> Admin Roles */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "tests"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>📝 Mock Tests ({mockTests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "create"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>➕ Add Question</span>
              {currentTargetTest && (
                <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.2 text-[10px] hidden sm:inline">
                  {currentTargetTest.name.slice(0, 18)}...
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
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
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "admins"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>👥 Admin Roles ({adminUsersList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">4 Subjects:</span>
            <span>Maths, Physics, Chem, Aptitude</span>
          </div>
        </div>

        {/* TAB 1: MOCK TESTS WORKFLOW (Requirement 2) */}
        {activeTab === "tests" && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                    Step 1: Mock Test Management
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                    Active Mock Tests & Entrance Simulations
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Create a new mock test or select an existing one to add questions directly to it.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingMockTest(!isCreatingMockTest)}
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all flex items-center gap-2"
                >
                  <span>{isCreatingMockTest ? "✕ Cancel" : "➕ Create New Mock Test"}</span>
                </button>
              </div>

              {/* Status messages for Mock Tests */}
              {testSuccessMessage && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <span>{testSuccessMessage}</span>
                </div>
              )}
              {testErrorMessage && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center gap-2">
                  <span>⚠️ {testErrorMessage}</span>
                </div>
              )}

              {/* Add New Mock Test Form Accordion */}
              {isCreatingMockTest && (
                <form onSubmit={handleCreateMockTest} className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/30 p-6 space-y-5 animate-in fade-in">
                  <h3 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
                    <span>📝</span>
                    <span>New Entrance Mock Test Details</span>
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Mock Test Name *
                      </label>
                      <input
                        type="text"
                        value={newTestName}
                        onChange={(e) => setNewTestName(e.target.value)}
                        placeholder="e.g. UGEE Full Mock Test 2 (SUPR & REAP)"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Target Entrance Program *
                      </label>
                      <select
                        value={newTestExamId}
                        onChange={(e) => setNewTestExamId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-600 shadow-xs"
                        required
                      >
                        {exams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name} ({ex.slug.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exam Duration (Minutes) *
                      </label>
                      <input
                        type="number"
                        min="10"
                        step="5"
                        value={newTestDuration}
                        onChange={(e) => setNewTestDuration(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                        required
                      />
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {(newTestDuration / 60).toFixed(1)} hours (auto-submits on expiry)
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Description / Syllabus Note
                      </label>
                      <input
                        type="text"
                        value={newTestDescription}
                        onChange={(e) => setNewTestDescription(e.target.value)}
                        placeholder="Comprehensive 4-subject entrance simulation with official timings..."
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingMockTest(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50"
                    >
                      {isPending ? "Creating Mock Test..." : "Save Mock Test & Continue →"}
                    </button>
                  </div>
                </form>
              )}

              {/* Grid of Existing Mock Tests */}
              <div className="mt-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Existing Mock Tests (Click &quot;Add Question&quot; to author questions):
                </h3>

                <div className="grid gap-6 md:grid-cols-2">
                  {mockTests.map((t) => {
                    const durationMins = Math.round((t.duration_seconds || 10800) / 60);
                    const exam = exams.find((e) => e.id === t.exam_id);
                    const isSelected = selectedTargetTestId === t.id;

                    return (
                      <div
                        key={t.id}
                        className={`flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-600/30 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                                {exam?.name || "ENTRANCE MOCK"} &bull; {t.test_type?.toUpperCase() || "MOCK"}
                              </span>
                              {t.status === "published" && (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  ● Live
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-semibold text-slate-500">
                                ⏱️ {durationMins} Mins
                              </span>

                              {/* Delete symbol at the edge of the mock test box */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMockTest(t.id, t.name);
                                }}
                                disabled={isPending}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-90"
                                title={`Delete Mock Test "${t.name}"`}
                                aria-label={`Delete Mock Test ${t.name}`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <h4 className="mt-3 text-xl font-black text-slate-900">{t.name}</h4>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {t.description || "Official IIITH CBT mock test simulation."}
                          </p>

                          {/* 4 Subjects tested */}
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                              📐 Mathematics
                            </span>
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              ⚡ Physics
                            </span>
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              🧪 Chemistry
                            </span>
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
                              🧠 Aptitude
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <span className="text-xs text-slate-500 font-medium">
                            Auto-submits on timer expiry
                          </span>

                          {/* Prominent "+ Add Question to this Test" action (Requirement 2) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTargetTestId(t.id);
                              setActiveTab("create");
                            }}
                            className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <span>➕ Add Question to this Test</span>
                            <span>&rarr;</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD QUESTION STUDIO (Connected to Mock Test) */}
        {activeTab === "create" && (
          <div className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                    Question Authoring Studio
                  </span>

                  {/* Target Mock Test Indicator & Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Target Mock Test:</span>
                    <select
                      value={selectedTargetTestId}
                      onChange={(e) => setSelectedTargetTestId(e.target.value)}
                      className="rounded-xl border border-blue-300 bg-blue-50/70 px-3 py-1.5 text-xs font-bold text-blue-950 outline-none focus:border-blue-600"
                    >
                      {mockTests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  Add Question, 4 Options & Detailed Explanation
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Questions added here will be immediately linked to <strong className="text-slate-800">{currentTargetTest?.name || "the selected mock test"}</strong> with verified answers and solutions.
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
                      Subject (4 Core Disciplines) *
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

                {/* 4. Four Options & Correct Answer Radio Key */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      4 Multiple Choice Options (Select Correct Option Radio) *
                    </label>
                    <span className="text-xs text-slate-500">Click radio button to mark correct answer</span>
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
                    This verified explanation will be displayed to students on their scorecard review page after submitting.
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

                {/* Target Mock Test Confirmation Notice */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-900 flex items-center justify-between">
                  <span>
                    Linking this question to: <strong>{currentTargetTest?.name || "Mock Test"}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tests")}
                    className="font-bold text-blue-700 hover:underline"
                  >
                    Change Mock Test &rarr;
                  </button>
                </div>

                {/* 3 Distinct Action Buttons: Add Question, Save, and Publish */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Target Test:</span>
                    <strong className="text-slate-800">{currentTargetTest?.name || "Mock Test"}</strong>
                    {currentTargetTest?.status === "published" && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        ● Published
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. Add Question Button */}
                    <button
                      type="button"
                      onClick={handleResetForNewQuestion}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all flex items-center gap-2 shadow-xs"
                      title="Clear question fields to start typing a new question"
                    >
                      <span className="text-blue-600 font-extrabold text-base leading-none">➕</span>
                      <span>Add Question</span>
                    </button>

                    {/* 2. Save Button */}
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                      title="Save this question, options, and explanation into the mock test"
                    >
                      <span>💾</span>
                      <span>{isPending ? "Saving..." : "Save"}</span>
                    </button>

                    {/* 3. Publish Button */}
                    <button
                      type="button"
                      onClick={handlePublishMockTest}
                      disabled={isPending || !selectedTargetTestId}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                      title="Publish this mock test so it becomes available for students"
                    >
                      <span>🚀</span>
                      <span>Publish</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: QUESTION BANK MANAGEMENT */}
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

        {/* TAB 4: ADMIN USERS ROLES */}
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
