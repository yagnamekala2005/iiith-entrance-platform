"use client";

import React, { useState, useTransition, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  addAdminUserByEmail,
  createAdminMockTest,
  deleteAdminMockTest,
  publishAdminMockTest,
  cleanAllOldMockTests,
  createAdminSubject,
  createAdminExam,
  createAdminPracticeQuestion,
  getAdminTopicPracticeQuestions,
  updateAdminPracticeQuestion,
  createAdminChapter,
  deleteAdminChapter,
  createAdminTopic,
  deleteAdminTopic,
  updateTopicLearningContent,
} from "@/lib/admin/actions";
import {
  parseTopicLearningContent,
  type LearningResource,
} from "@/lib/learning/topic-content";
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
  description?: string | null;
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
  subject_id?: string;
  chapter_id?: string | null;
  topic_id?: string | null;
  exam_id?: string | null;
  question_text: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  subject?: { id: string; name: string } | null;
  options: { id: string; option_label: string; option_text: string; display_order?: number }[];
  answer_key?: { correct_option_id: string }[] | null;
  test_questions?: { test_id: string; display_order?: number }[];
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
  const OLD_TEST_IDS = useMemo(
    () =>
      new Set([
        "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
        "64a2c6a7-77eb-426e-bc3f-c492865aac77",
        "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
      ]),
    []
  );

  // Primary navigation: Mock Tests -> Add Question -> My Learning -> Admin Roles (Question Bank removed)
  const [activeTab, setActiveTab] = useState<"tests" | "create" | "learning" | "admins">("tests");
  const [isPending, startTransition] = useTransition();

  // Exams State
  const [adminExams, setAdminExams] = useState<ExamItem[]>(exams);
  const [isAddingExam, setIsAddingExam] = useState<boolean>(false);
  const [newExamName, setNewExamName] = useState<string>("");
  const [newExamDescription, setNewExamDescription] = useState<string>("");
  const [newExamNegativeMarking, setNewExamNegativeMarking] = useState<string>("");

  // Mock Tests State
  const [mockTests, setMockTests] = useState<TestItem[]>(() =>
    tests.filter((t) => !OLD_TEST_IDS.has(t.id) && t.status !== "archived")
  );
  const [selectedTargetTestId, setSelectedTargetTestId] = useState<string>(
    tests.filter((t) => !OLD_TEST_IDS.has(t.id) && t.status !== "archived")[0]?.id || ""
  );
  const [isCreatingMockTest, setIsCreatingMockTest] = useState<boolean>(false);
  const [newTestName, setNewTestName] = useState<string>("");
  const [newTestExamId, setNewTestExamId] = useState<string>(adminExams[0]?.id || "");
  const [newTestDuration, setNewTestDuration] = useState<number>(180);
  const [newTestDescription, setNewTestDescription] = useState<string>("");
  const [testSuccessMessage, setTestSuccessMessage] = useState<string>("");
  const [testErrorMessage, setTestErrorMessage] = useState<string>("");

  // My Learning State (Subjects, Chapters, Subtopics)
  const [adminSubjects, setAdminSubjects] = useState<SubjectItem[]>(subjects);
  const [adminChapters, setAdminChapters] = useState<ChapterItem[]>(chapters);
  const [adminTopics, setAdminTopics] = useState<TopicItem[]>(topics);
  const [selectedLearningSubjectId, setSelectedLearningSubjectId] = useState<string>(subjects[0]?.id || "");
  const [newChapterName, setNewChapterName] = useState<string>("");
  const [newTopicName, setNewTopicName] = useState<string>("");
  const [targetChapterIdForTopic, setTargetChapterIdForTopic] = useState<string>("");
  const [learningSuccessMessage, setLearningSuccessMessage] = useState<string>("");
  const [learningErrorMessage, setLearningErrorMessage] = useState<string>("");
  const [isAddingSubject, setIsAddingSubject] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [newSubjectDescription, setNewSubjectDescription] = useState<string>("");

  // Topic Practice Question State
  const [practiceTopic, setPracticeTopic] = useState<TopicItem | null>(null);
  const [practiceQuestionText, setPracticeQuestionText] = useState<string>("");
  const [practiceOptions, setPracticeOptions] = useState<[string, string, string, string]>(["", "", "", ""]);
  const [practiceCorrectOption, setPracticeCorrectOption] = useState<string>("A");
  const [practiceDifficulty, setPracticeDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [practiceMarks, setPracticeMarks] = useState<number>(1);
  const [practiceExplanation, setPracticeExplanation] = useState<string>("");
  const [practiceSuccessMessage, setPracticeSuccessMessage] = useState<string>("");
  const [practiceErrorMessage, setPracticeErrorMessage] = useState<string>("");
  const [practiceQuestions, setPracticeQuestions] = useState<Awaited<ReturnType<typeof getAdminTopicPracticeQuestions>>["questions"]>([]);
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState<number>(0);
  const [practiceEditingId, setPracticeEditingId] = useState<string | null>(null);
  const [practiceQuestionsLoading, setPracticeQuestionsLoading] = useState<boolean>(false);

  // Topic Rich Learning Content Editor Modal state
  const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
  const [editTopicName, setEditTopicName] = useState<string>("");
  const [editExplanation, setEditExplanation] = useState<string>("");
  const [editFormulas, setEditFormulas] = useState<string>("");
  const [editResources, setEditResources] = useState<LearningResource[]>([]);
  const [isSavingTopicContent, setIsSavingTopicContent] = useState<boolean>(false);

  // References to keep event handlers current without re-attaching listeners
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const editingTopicRef = useRef(editingTopic);
  editingTopicRef.current = editingTopic;

  const isCreatingMockTestRef = useRef(isCreatingMockTest);
  isCreatingMockTestRef.current = isCreatingMockTest;

  // Intercept back navigation so mobile phone gestures / back buttons come back 1 step instead of exiting app
  useEffect(() => {
    // Push an initial admin history state so mobile back gesture is intercepted
    window.history.pushState({ adminStudio: true, tab: "tests" }, "");

    const onPopState = () => {
      // 1. If Topic Learning Content Editor modal is open, close it (1 step back)
      if (editingTopicRef.current) {
        setEditingTopic(null);
        window.history.pushState({ adminStudio: true, tab: activeTabRef.current }, "");
        return;
      }

      // 2. If New Mock Test form is open, close it (1 step back)
      if (isCreatingMockTestRef.current) {
        setIsCreatingMockTest(false);
        window.history.pushState({ adminStudio: true, tab: "tests" }, "");
        return;
      }

      // 3. If on a subtab ("learning", "create", "admins"), return to "tests" tab (1 step back)
      if (activeTabRef.current !== "tests") {
        setActiveTab("tests");
        window.history.pushState({ adminStudio: true, tab: "tests" }, "");
        return;
      }

      // 4. If already on the root "tests" tab, safely navigate back to dashboard instead of exiting app!
      window.location.href = "/dashboard";
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const switchTab = (tab: "tests" | "create" | "learning" | "admins") => {
    setActiveTab(tab);
    window.history.pushState({ adminStudio: true, tab }, "");
  };

  // All questions in database
  const [questions, setQuestions] = useState<QuestionAdminItem[]>(initialQuestions);

  // Questions belonging to the currently selected mock test
  const currentTestQuestions = useMemo(() => {
    if (!selectedTargetTestId) return [];
    return questions.filter((q) =>
      q.test_questions?.some((tq) => tq.test_id === selectedTargetTestId)
    );
  }, [questions, selectedTargetTestId]);

  // Selected mock test details
  const currentTargetTest = mockTests.find((t) => t.id === selectedTargetTestId) || mockTests[0];

  // Carousel & Question Index State
  // When activeQuestionIndex < currentTestQuestions.length -> viewing/editing existing question
  // When activeQuestionIndex >= currentTestQuestions.length -> authoring a new question
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Question Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || "");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedExamId, setSelectedExamId] = useState<string>(adminExams[0]?.id || "");
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

  // Admin enrollment
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [adminEnrollMsg, setAdminEnrollMsg] = useState<string>("");

  // Filtered chapters & topics for question creator
  const filteredChapters = adminChapters.filter((c) => c.subject_id === selectedSubjectId);
  const filteredTopics = adminTopics.filter((t) => t.chapter_id === selectedChapterId);

  // Current editing state
  const isEditingExisting = activeQuestionIndex < currentTestQuestions.length;
  const currentEditingQuestion = isEditingExisting ? currentTestQuestions[activeQuestionIndex] : null;

  // Sign out handler
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login?role=admin";
  };

  // Populate form with question data
  const populateFormWithQuestion = (q: QuestionAdminItem) => {
    setQuestionText(q.question_text || "");
    setDifficulty((q.difficulty as "easy" | "medium" | "hard") || "medium");
    setMarks(q.marks ?? 1);
    setNegativeMarks(q.negative_marks ?? 0.25);
    setExplanation(q.explanation || "");
    setSelectedSubjectId(q.subject_id || q.subject?.id || subjects[0]?.id || "");
    setSelectedChapterId(q.chapter_id || "");
    setSelectedTopicId(q.topic_id || "");
    setSelectedExamId(q.exam_id || currentTargetTest?.exam_id || adminExams[0]?.id || "");

    const sortedOpts = [...(q.options || [])].sort((a, b) =>
      a.option_label.localeCompare(b.option_label)
    );
    const optA = sortedOpts.find((o) => o.option_label === "A")?.option_text || "";
    const optB = sortedOpts.find((o) => o.option_label === "B")?.option_text || "";
    const optC = sortedOpts.find((o) => o.option_label === "C")?.option_text || "";
    const optD = sortedOpts.find((o) => o.option_label === "D")?.option_text || "";
    setOptions([optA, optB, optC, optD]);

    const correctOptId = q.answer_key?.[0]?.correct_option_id;
    const correctOpt = sortedOpts.find((o) => o.id === correctOptId || o.option_label === correctOptId);
    setCorrectOptionLabel(correctOpt?.option_label || "A");
  };

  // Reset form for authoring a new question
  const resetFormForNewQuestion = () => {
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setExplanation("");
    setCorrectOptionLabel("A");
    setMarks(1);
    setNegativeMarks(0.25);
    setErrorMessage("");
  };

  // Synchronize form when selectedTargetTestId changes
  const handleSelectTargetTest = (testId: string) => {
    setSelectedTargetTestId(testId);
    const qs = questions.filter((q) => q.test_questions?.some((tq) => tq.test_id === testId));
    if (qs.length > 0) {
      setActiveQuestionIndex(0);
      populateFormWithQuestion(qs[0]);
    } else {
      setActiveQuestionIndex(0);
      resetFormForNewQuestion();
    }
    setSuccessMessage("");
    setErrorMessage("");
  };

  // Carousel Navigation: Previous
  const handlePrevQuestion = () => {
    if (activeQuestionIndex > 0) {
      const prevIdx = activeQuestionIndex - 1;
      setActiveQuestionIndex(prevIdx);
      if (currentTestQuestions[prevIdx]) {
        populateFormWithQuestion(currentTestQuestions[prevIdx]);
      }
      setSuccessMessage("");
      setErrorMessage("");
    }
  };

  // Carousel Navigation: Next
  const handleNextQuestion = () => {
    if (activeQuestionIndex < currentTestQuestions.length - 1) {
      const nextIdx = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIdx);
      populateFormWithQuestion(currentTestQuestions[nextIdx]);
      setSuccessMessage("");
      setErrorMessage("");
    } else if (activeQuestionIndex === currentTestQuestions.length - 1) {
      // Advance to "New Question" mode
      setActiveQuestionIndex(currentTestQuestions.length);
      resetFormForNewQuestion();
      setSuccessMessage(`✍️ Ready to add Question #${currentTestQuestions.length + 1}.`);
      setErrorMessage("");
    }
  };

  // Carousel: Jump to + New Question
  const handleNewQuestionClick = () => {
    setActiveQuestionIndex(currentTestQuestions.length);
    resetFormForNewQuestion();
    setSuccessMessage(`✍️ Ready to author new Question #${currentTestQuestions.length + 1}.`);
    setErrorMessage("");
  };

  // Jump directly to an existing question by index
  const handleJumpToQuestion = (idx: number) => {
    if (idx >= 0 && idx < currentTestQuestions.length) {
      setActiveQuestionIndex(idx);
      populateFormWithQuestion(currentTestQuestions[idx]);
      setSuccessMessage("");
      setErrorMessage("");
    } else if (idx === currentTestQuestions.length) {
      handleNewQuestionClick();
    }
  };

  // Handle Option change
  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options] as [string, string, string, string];
    updated[index] = value;
    setOptions(updated);
  };

  const populatePracticeQuestionForm = (question: Awaited<ReturnType<typeof getAdminTopicPracticeQuestions>>["questions"][number]) => {
    setPracticeEditingId(question.id);
    setPracticeQuestionText(question.question_text || "");
    setPracticeOptions([
      question.options.find((o) => o.option_label === "A")?.option_text || "",
      question.options.find((o) => o.option_label === "B")?.option_text || "",
      question.options.find((o) => o.option_label === "C")?.option_text || "",
      question.options.find((o) => o.option_label === "D")?.option_text || "",
    ]);
    setPracticeCorrectOption(question.correct_option_label || "A");
    setPracticeDifficulty(question.difficulty || "medium");
    setPracticeMarks(question.marks ?? 1);
    setPracticeExplanation(question.explanation || "");
    setPracticeSuccessMessage("");
    setPracticeErrorMessage("");
  };

  const openPracticeQuestionEditor = (topic: TopicItem) => {
    setPracticeTopic(topic);
    setPracticeQuestions([]);
    setPracticeQuestionIndex(0);
    setPracticeEditingId(null);
    setPracticeQuestionText("");
    setPracticeOptions(["", "", "", ""]);
    setPracticeCorrectOption("A");
    setPracticeDifficulty("medium");
    setPracticeMarks(1);
    setPracticeExplanation("");
    setPracticeSuccessMessage("");
    setPracticeErrorMessage("");
    setPracticeQuestionsLoading(true);

    startTransition(async () => {
      const res = await getAdminTopicPracticeQuestions(topic.id);
      setPracticeQuestionsLoading(false);

      if (res.success) {
        setPracticeQuestions(res.questions);
        if (res.questions.length > 0) {
          populatePracticeQuestionForm(res.questions[0]);
        }
      } else {
        setPracticeErrorMessage(res.error || "Failed to load practice questions.");
      }
    });
  };

  const handlePracticeQuestionNavigation = (index: number) => {
    if (index < 0 || index >= practiceQuestions.length) return;
    setPracticeQuestionIndex(index);
    populatePracticeQuestionForm(practiceQuestions[index]);
  };

  const handleNewPracticeQuestion = () => {
    setPracticeQuestionIndex(practiceQuestions.length);
    setPracticeEditingId(null);
    setPracticeQuestionText("");
    setPracticeOptions(["", "", "", ""]);
    setPracticeCorrectOption("A");
    setPracticeDifficulty("medium");
    setPracticeMarks(1);
    setPracticeExplanation("");
    setPracticeSuccessMessage("");
    setPracticeErrorMessage("");
  };

  const handlePracticeOptionChange = (index: number, value: string) => {
    const updated = [...practiceOptions] as [string, string, string, string];
    updated[index] = value;
    setPracticeOptions(updated);
  };

  const handleCreatePracticeQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setPracticeSuccessMessage("");
    setPracticeErrorMessage("");

    if (!practiceTopic) return;

    const chapter = adminChapters.find((item) => item.id === practiceTopic.chapter_id);
    const subjectId = chapter?.subject_id;

    if (!subjectId) {
      setPracticeErrorMessage("Unable to determine the subject for this topic.");
      return;
    }

    if (!practiceQuestionText.trim()) {
      setPracticeErrorMessage("Please enter the question statement.");
      return;
    }

    if (practiceOptions.some((option) => !option.trim())) {
      setPracticeErrorMessage("Please enter all 4 options (A, B, C, D).");
      return;
    }

    if (!practiceExplanation.trim()) {
      setPracticeErrorMessage("Please provide the solution explanation.");
      return;
    }

    startTransition(async () => {
      const payload = {
        question_text: practiceQuestionText.trim(),
        difficulty: practiceDifficulty,
        explanation: practiceExplanation.trim(),
        marks: Number(practiceMarks) || 1,
        options: [
          { label: "A", text: practiceOptions[0].trim() },
          { label: "B", text: practiceOptions[1].trim() },
          { label: "C", text: practiceOptions[2].trim() },
          { label: "D", text: practiceOptions[3].trim() },
        ],
        correct_option_label: practiceCorrectOption,
      };

      const res = practiceEditingId
        ? await updateAdminPracticeQuestion(practiceEditingId, payload)
        : await createAdminPracticeQuestion({
            subject_id: subjectId,
            chapter_id: practiceTopic.chapter_id,
            topic_id: practiceTopic.id,
            ...payload,
          });

      if (res.success) {
        setPracticeSuccessMessage(
          practiceEditingId
            ? "✅ Practice question updated successfully."
            : "✅ Practice question saved and published for this topic."
        );

        const refreshed = await getAdminTopicPracticeQuestions(practiceTopic.id);
        if (refreshed.success) {
          setPracticeQuestions(refreshed.questions);
          const targetIndex = practiceEditingId
            ? Math.max(0, refreshed.questions.findIndex((q) => q.id === practiceEditingId))
            : Math.max(0, refreshed.questions.length - 1);
          setPracticeQuestionIndex(targetIndex);
          if (refreshed.questions[targetIndex]) {
            populatePracticeQuestionForm(refreshed.questions[targetIndex]);
          }
        }
      } else {
        setPracticeErrorMessage(res.error || "Failed to save practice question.");
      }
    });
  };

  // Handler: Create Mock Test
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestErrorMessage("");
    setTestSuccessMessage("");

    if (!newExamName.trim()) {
      setTestErrorMessage("Please enter an exam name.");
      return;
    }

    const parsedNegativeMarking =
      newExamNegativeMarking.trim() === "" ? null : Number(newExamNegativeMarking);

    if (
      parsedNegativeMarking !== null &&
      (!Number.isFinite(parsedNegativeMarking) || parsedNegativeMarking < 0)
    ) {
      setTestErrorMessage("Negative marking ratio must be a valid non-negative number.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminExam(
        newExamName.trim(),
        newExamDescription.trim(),
        parsedNegativeMarking
      );

      if (res.success && res.exam) {
        const createdExam: ExamItem = {
          id: res.exam.id,
          name: res.exam.name,
          slug: res.exam.slug,
        };

        setAdminExams((prev) => [...prev, createdExam]);
        setNewTestExamId(createdExam.id);
        setSelectedExamId(createdExam.id);
        setNewExamName("");
        setNewExamDescription("");
        setNewExamNegativeMarking("");
        setIsAddingExam(false);
        setTestSuccessMessage(
          `✅ Exam "${createdExam.name}" created in Supabase. It is saved as unpublished until you are ready to use it.`
        );
      } else {
        setTestErrorMessage(res.error || "Failed to create exam.");
      }
    });
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
          status: "draft",
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

  // Handler: Save or Update Question (connected to carousel & mock test)
  const handleSaveQuestion = async (e: React.FormEvent) => {
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
      setErrorMessage("Please select a target mock test to link this question to.");
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

    startTransition(async () => {
      if (isEditingExisting && currentEditingQuestion) {
        // Updating existing question in Supabase
        const res = await updateAdminQuestion(currentEditingQuestion.id, payload);
        if (res.success) {
          setSuccessMessage(
            `✅ Question #${activeQuestionIndex + 1} updated successfully in Supabase!`
          );

          // Update question in local state
          setQuestions((prev) =>
            prev.map((q) => {
              if (q.id === currentEditingQuestion.id) {
                return {
                  ...q,
                  question_text: payload.question_text,
                  difficulty: payload.difficulty,
                  marks: payload.marks,
                  negative_marks: payload.negative_marks,
                  explanation: payload.explanation,
                  subject_id: payload.subject_id,
                  chapter_id: payload.chapter_id,
                  topic_id: payload.topic_id,
                  exam_id: payload.exam_id,
                  subject: subjects.find((s) => s.id === payload.subject_id),
                  options: payload.options.map((o) => ({
                    id: o.label,
                    option_label: o.label,
                    option_text: o.text,
                  })),
                  answer_key: [{ correct_option_id: payload.correct_option_label }],
                };
              }
              return q;
            })
          );
        } else {
          setErrorMessage(res.error || "Failed to update question in Supabase.");
        }
      } else {
        // Authoring and inserting new question in Supabase
        const res = await createAdminQuestion(payload);
        if (res.success && res.questionId) {
          const newNumber = currentTestQuestions.length + 1;
          const newQItem: QuestionAdminItem = {
            id: res.questionId,
            question_text: payload.question_text,
            difficulty: payload.difficulty,
            marks: payload.marks,
            negative_marks: payload.negative_marks,
            explanation: payload.explanation,
            subject_id: payload.subject_id,
            chapter_id: payload.chapter_id,
            topic_id: payload.topic_id,
            exam_id: payload.exam_id,
            subject: subjects.find((s) => s.id === payload.subject_id),
            options: payload.options.map((o) => ({
              id: o.label,
              option_label: o.label,
              option_text: o.text,
            })),
            answer_key: [{ correct_option_id: payload.correct_option_label }],
            test_questions: [
              {
                test_id: selectedTargetTestId,
                display_order: newNumber,
              },
            ],
          };

          setQuestions((prev) => [...prev, newQItem]);
          setSuccessMessage(
            `✅ Question #${newNumber} saved to Supabase! Now ready for Question #${newNumber + 1}.`
          );

          // Clear form and advance active index to new authoring slot
          resetFormForNewQuestion();
          setActiveQuestionIndex(newNumber);
        } else {
          setErrorMessage(res.error || "Failed to create question in Supabase.");
        }
      }
    });
  };

  // Handler: Delete Active Question in Carousel
  const handleDeleteActiveQuestion = async () => {
    if (!isEditingExisting || !currentEditingQuestion) return;
    if (
      !confirm(
        `Are you sure you want to delete Question #${activeQuestionIndex + 1} from Supabase?`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAdminQuestion(currentEditingQuestion.id);
      if (res.success) {
        setQuestions((prev) => prev.filter((q) => q.id !== currentEditingQuestion.id));
        setSuccessMessage(`🗑️ Question #${activeQuestionIndex + 1} deleted from Supabase.`);

        const remaining = currentTestQuestions.filter((q) => q.id !== currentEditingQuestion.id);
        if (remaining.length > 0) {
          const newIdx = Math.max(0, Math.min(activeQuestionIndex, remaining.length - 1));
          setActiveQuestionIndex(newIdx);
          populateFormWithQuestion(remaining[newIdx]);
        } else {
          setActiveQuestionIndex(0);
          resetFormForNewQuestion();
        }
      } else {
        setErrorMessage(res.error || "Failed to delete question from Supabase.");
      }
    });
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
      const res = await publishAdminMockTest(selectedTargetTestId);
      if (res.success) {
        setMockTests((prev) =>
          prev.map((t) => (t.id === selectedTargetTestId ? { ...t, status: "published" } : t))
        );
        setSuccessMessage(
          `🚀 Mock Test "${testName}" has been successfully PUBLISHED! It is now live for all students to take.`
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
        `Are you sure you want to delete mock test "${testName}"?\n\nThis will remove the mock test, its question associations, and test sections.`
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
            const nextId = remaining[0]?.id || "";
            setSelectedTargetTestId(nextId);
          }
          return remaining;
        });
      } else {
        setTestErrorMessage(res.error || "Failed to delete mock test.");
      }
    });
  };

  // Handler: Clean All Old Mock Tests
  const handleCleanAllOldTests = async () => {
    if (
      !confirm(
        "Are you sure you want to remove all existing mock tests and useless test data?\n\nThis will remove the current sample mock tests so you can author fresh mock tests and questions."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await cleanAllOldMockTests();
      if (res.success) {
        setMockTests([]);
        setSelectedTargetTestId("");
        setQuestions([]);
        setTestSuccessMessage("🧹 All old mock tests and useless test data removed successfully!");
      } else {
        setTestErrorMessage(res.error || "Failed to remove old mock tests.");
      }
    });
  };

  // Learning Handler: Create Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLearningErrorMessage("");
    setLearningSuccessMessage("");

    if (!newSubjectName.trim()) {
      setLearningErrorMessage("Please enter a subject name.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminSubject(
        newSubjectName.trim(),
        newSubjectDescription.trim()
      );

      if (res.success && res.subject) {
        setAdminSubjects((prev) => [...prev, res.subject]);
        setSelectedLearningSubjectId(res.subject.id);
        setSelectedSubjectId(res.subject.id);
        setNewSubjectName("");
        setNewSubjectDescription("");
        setIsAddingSubject(false);
        setLearningSuccessMessage(
          `✅ Subject "${res.subject.name}" added to Supabase and synced to the admin/student learning hierarchy!`
        );
      } else {
        setLearningErrorMessage(res.error || "Failed to create subject.");
      }
    });
  };

  // Learning Handler: Create Chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLearningErrorMessage("");
    setLearningSuccessMessage("");

    if (!newChapterName.trim()) {
      setLearningErrorMessage("Please enter a chapter name.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminChapter(selectedLearningSubjectId, newChapterName.trim());
      if (res.success && res.chapter) {
        setAdminChapters((prev) => [...prev, res.chapter]);
        setNewChapterName("");
        setLearningSuccessMessage(`✅ Chapter "${res.chapter.name}" added and synced to Student My Learning!`);
      } else {
        setLearningErrorMessage(res.error || "Failed to create chapter.");
      }
    });
  };

  // Learning Handler: Delete Chapter
  const handleDeleteChapter = async (chapterId: string, chapterName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete chapter "${chapterName}" and all its subtopics?\n\nThis will remove it from the Student My Learning portal.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAdminChapter(chapterId);
      if (res.success) {
        setAdminChapters((prev) => prev.filter((c) => c.id !== chapterId));
        setAdminTopics((prev) => prev.filter((t) => t.chapter_id !== chapterId));
        setLearningSuccessMessage(`🗑️ Chapter "${chapterName}" was deleted.`);
      } else {
        setLearningErrorMessage(res.error || "Failed to delete chapter.");
      }
    });
  };

  // Learning Handler: Create Topic
  const handleCreateTopic = async (chapterId: string) => {
    setLearningErrorMessage("");
    setLearningSuccessMessage("");

    if (!newTopicName.trim()) {
      setLearningErrorMessage("Please enter a subtopic name.");
      return;
    }

    startTransition(async () => {
      const res = await createAdminTopic(chapterId, newTopicName.trim());
      if (res.success && res.topic) {
        setAdminTopics((prev) => [...prev, res.topic]);
        setNewTopicName("");
        setTargetChapterIdForTopic("");
        setLearningSuccessMessage(`✅ Subtopic "${res.topic.name}" added and synced to Student My Learning!`);
      } else {
        setLearningErrorMessage(res.error || "Failed to create subtopic.");
      }
    });
  };

  // Learning Handler: Delete Topic
  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    if (!confirm(`Are you sure you want to delete subtopic "${topicName}"?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteAdminTopic(topicId);
      if (res.success) {
        setAdminTopics((prev) => prev.filter((t) => t.id !== topicId));
        setLearningSuccessMessage(`🗑️ Subtopic "${topicName}" was deleted.`);
      } else {
        setLearningErrorMessage(res.error || "Failed to delete subtopic.");
      }
    });
  };

  // Open Topic Learning Content Editor Modal
  const handleOpenTopicEditor = (topic: TopicItem) => {
    setEditingTopic(topic);
    setEditTopicName(topic.name);
    const content = parseTopicLearningContent(topic.description);
    setEditExplanation(content.explanation || "");
    setEditFormulas(content.formulas || "");
    setEditResources(content.resources && content.resources.length > 0 ? content.resources : []);
    window.history.pushState({ adminStudio: true, modal: "topic" }, "");
  };

  // Add Resource Row in Topic Editor Modal
  const handleAddResourceRow = () => {
    setEditResources((prev) => [
      ...prev,
      { title: "", url: "", type: "pdf" },
    ]);
  };

  // Update Resource Row
  const handleUpdateResourceRow = (
    idx: number,
    field: keyof LearningResource,
    val: string
  ) => {
    setEditResources((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Remove Resource Row
  const handleRemoveResourceRow = (idx: number) => {
    setEditResources((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Topic Rich Learning Content to Supabase
  const handleSaveTopicContent = async () => {
    if (!editingTopic) return;
    setIsSavingTopicContent(true);

    const validResources = editResources.filter(
      (r) => r.title.trim() && r.url.trim()
    );

    const res = await updateTopicLearningContent(editingTopic.id, {
      name: editTopicName.trim(),
      explanation: editExplanation.trim(),
      formulas: editFormulas.trim(),
      resources: validResources,
    });

    setIsSavingTopicContent(false);

    if (res.success && res.topic) {
      setAdminTopics((prev) =>
        prev.map((t) => (t.id === editingTopic.id ? { ...t, ...res.topic } : t))
      );
      setLearningSuccessMessage(
        `✅ Subtopic "${editTopicName}" learning material (notes, formulas, ${validResources.length} materials) saved to Supabase & synced to Student My Learning!`
      );
      setEditingTopic(null);
    } else {
      setLearningErrorMessage(res.error || "Failed to update subtopic learning content.");
    }
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans relative overflow-x-hidden w-full max-w-full">
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
        {/* Navigation Tabs: Mock Tests -> Add Question -> My Learning -> Admin Roles (Question Bank completely removed) */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => switchTab("tests")}
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
              onClick={() => switchTab("create")}
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "create"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>➕ Add Question</span>
              {currentTargetTest && (
                <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] hidden sm:inline">
                  {currentTestQuestions.length} Qs in {currentTargetTest.name.slice(0, 15)}...
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => switchTab("learning")}
              className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "learning"
                  ? "bg-blue-700 text-white shadow-md shadow-blue-700/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>📖 My Learning</span>
              <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] hidden sm:inline">
                {adminChapters.length} Chap / {adminTopics.length} Topics
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab("admins")}
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
            <span className="font-semibold">Curriculum Disciplines:</span>
            <span>Maths, Physics, Chem, Aptitude</span>
          </div>
        </div>

        {/* TAB 1: MOCK TESTS WORKFLOW */}
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

                <div className="flex flex-wrap items-center gap-2">
                  {mockTests.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCleanAllOldTests}
                      disabled={isPending}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-800 hover:bg-rose-100 hover:border-rose-400 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                      title="Remove old / unused mock tests to author fresh ones"
                    >
                      <span>🧹</span>
                      <span>Remove Old Mock Tests ({mockTests.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddingExam((prev) => !prev)}
                    className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-800 hover:bg-blue-100 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>{isAddingExam ? "✕ Cancel Exam" : "➕ Add Exam"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCreatingMockTest(!isCreatingMockTest)}
                    className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all flex items-center gap-2"
                  >
                    <span>{isCreatingMockTest ? "✕ Cancel" : "➕ Create New Mock Test"}</span>
                  </button>
                </div>
              </div>

{/* Status messages for Mock Tests */}              {isAddingExam && (
                <form onSubmit={handleCreateExam} className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-extrabold text-slate-900">Add New Exam</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      This creates the exam directly in Supabase. New exams are unpublished by default.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exam Name *
                      </label>
                      <input
                        type="text"
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                        placeholder="e.g. IIITH UG Entrance 2027"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Negative Marking Ratio
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newExamNegativeMarking}
                        onChange={(e) => setNewExamNegativeMarking(e.target.value)}
                        placeholder="e.g. 0.25"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={newExamDescription}
                        onChange={(e) => setNewExamDescription(e.target.value)}
                        placeholder="Exam syllabus or instructions"
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60 transition-all"
                    >
                      {isPending ? "Saving..." : "Save Exam to Supabase"}
                    </button>
                  </div>
                </form>
              )}


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
                        Exam Track *
                      </label>
                      <select
                        value={newTestExamId}
                        onChange={(e) => setNewTestExamId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                      >
                        {adminExams.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="360"
                        value={newTestDuration}
                        onChange={(e) => setNewTestDuration(Number(e.target.value))}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Description / Syllabus Note
                      </label>
                      <input
                        type="text"
                        value={newTestDescription}
                        onChange={(e) => setNewTestDescription(e.target.value)}
                        placeholder="e.g. Complete 3-hour mock test with SUPR and REAP sections."
                        className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-100">
                    <button
                      type="button"
                      onClick={() => setIsCreatingMockTest(false)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-blue-700 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 disabled:opacity-50 transition-all"
                    >
                      {isPending ? "Creating..." : "Save Mock Test"}
                    </button>
                  </div>
                </form>
              )}

              {/* Mock Tests List */}
              <div className="mt-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  {mockTests.length === 0 ? (
                    <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
                      <span className="text-3xl">📝</span>
                      <h4 className="mt-2 text-base font-bold text-slate-800">No mock tests available</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Click &quot;➕ Create New Mock Test&quot; above to create your first mock test and start adding questions.
                      </p>
                    </div>
                  ) : (
                    mockTests.map((t) => {
                      const countInThisTest = questions.filter((q) =>
                        q.test_questions?.some((tq) => tq.test_id === t.id)
                      ).length;
                      const isSelected = selectedTargetTestId === t.id;

                      return (
                        <div
                          key={t.id}
                          className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-xs ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                                  {Math.round((t.duration_seconds || 10800) / 60)} Mins
                                </span>
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                    t.status === "published"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {t.status === "published" ? "● Live / Published" : "○ Draft Mode"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMockTest(t.id, t.name)}
                                  disabled={isPending}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                  title="Delete mock test"
                                >
                                  <svg
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
                              {t.description || "Official IIITH CBT entrance mock test simulation."}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                                📊 Questions in test: <strong className="text-blue-700">{countInThisTest}</strong>
                              </span>
                            </div>

                            {/* 4 Subjects tested */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
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
                              {t.status === "published" ? "Available in Student Portal" : "Draft — ready for questions"}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                handleSelectTargetTest(t.id);
                                setActiveTab("create");
                              }}
                              className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                              <span>➕ Manage &amp; Add Questions</span>
                              <span>&rarr;</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD QUESTION STUDIO WITH QUESTION CAROUSEL & ARROW NAVIGATION */}
        {activeTab === "create" && (
          <div className="mt-6 space-y-4">
            {/* Step-Back Navigation: Return to Mock Tests */}
            <button
              type="button"
              onClick={() => switchTab("tests")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all shadow-2xs"
              title="Go back to Mock Tests (1 step back)"
            >
              <span className="text-sm font-black leading-none">‹</span>
              <span>Back to Mock Tests</span>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              {/* Studio Header & Target Mock Test Picker */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                    Step 2: Question Authoring &amp; Carousel Navigation
                  </span>

                  {/* Target Mock Test Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Target Mock Test:</span>
                    <select
                      value={selectedTargetTestId}
                      onChange={(e) => handleSelectTargetTest(e.target.value)}
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
                  Question Studio: Author &amp; Navigate Questions
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Add new questions or use the arrow buttons to review, inspect, and update existing questions in{" "}
                  <strong className="text-slate-800">{currentTargetTest?.name || "Selected Test"}</strong>.
                </p>
              </div>

              {/* Status Alerts */}
              {successMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                  <span>{successMessage}</span>
                  <button
                    type="button"
                    onClick={() => setSuccessMessage("")}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}
              {errorMessage && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 flex items-center justify-between">
                  <span>⚠️ {errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage("")}
                    className="text-xs font-bold text-rose-700 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* QUESTION CAROUSEL & NAVIGATION CONTROLS (ARROWS + LIVE COUNT DISPLAY) */}
              {/* ========================================================================= */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 p-4 sm:p-5 shadow-xs">
                {/* Left: Active Question Number Indicator */}
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white font-black text-sm sm:text-base shadow-xs">
                    #{isEditingExisting ? activeQuestionIndex + 1 : currentTestQuestions.length + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-blue-950">
                        {isEditingExisting
                          ? `Question ${activeQuestionIndex + 1} of ${currentTestQuestions.length}`
                          : currentTestQuestions.length === 0
                          ? "Question 1 (New Question)"
                          : `Question ${currentTestQuestions.length + 1} of ${currentTestQuestions.length} (New Question)`}
                      </span>
                      {isEditingExisting ? (
                        <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300">
                          ✓ Saved in Database
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                          ✍️ Drafting New Question
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Target Test: <strong className="text-slate-800">{currentTargetTest?.name || "Mock Test"}</strong>
                      {" • "}Total Questions Saved:{" "}
                      <strong className="text-blue-700">{currentTestQuestions.length}</strong>
                    </p>
                  </div>
                </div>

                {/* Right: Arrow Controls & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Arrow Left (Previous Question) */}
                  <button
                    type="button"
                    onClick={handlePrevQuestion}
                    disabled={activeQuestionIndex === 0}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs"
                    title="Navigate to Previous Question"
                  >
                    <span className="text-base font-black">◀</span>
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  {/* Question Counter / Jump Dropdown */}
                  <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500">Q</span>
                    <select
                      value={activeQuestionIndex}
                      onChange={(e) => handleJumpToQuestion(Number(e.target.value))}
                      className="bg-transparent text-xs font-black text-blue-900 outline-none cursor-pointer"
                    >
                      {currentTestQuestions.map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1} of {currentTestQuestions.length}
                        </option>
                      ))}
                      <option value={currentTestQuestions.length}>
                        {currentTestQuestions.length + 1} (+ New)
                      </option>
                    </select>
                  </div>

                  {/* Arrow Right (Next Question) */}
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!isEditingExisting}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs"
                    title="Navigate to Next Question"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="text-base font-black">▶</span>
                  </button>

                  {/* Explicit + New Question button */}
                  <button
                    type="button"
                    onClick={handleNewQuestionClick}
                    className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      !isEditingExisting
                        ? "bg-blue-700 text-white shadow-blue-700/20"
                        : "border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
                    }`}
                    title="Draft a new question for this mock test"
                  >
                    <span>➕</span>
                    <span>New Question</span>
                  </button>

                  {/* Delete button if editing existing */}
                  {isEditingExisting && (
                    <button
                      type="button"
                      onClick={handleDeleteActiveQuestion}
                      disabled={isPending}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all flex items-center gap-1"
                      title="Delete this question from database"
                    >
                      <span>🗑️</span>
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Question Authoring Form */}
              <form onSubmit={handleSaveQuestion} className="mt-6 space-y-6">
                {/* 1. Subject & Hierarchy Selection */}
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
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                      required
                    >
                      {adminSubjects.map((sub) => (
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
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                    >
                      <option value="">-- All / General Chapter --</option>
                      {filteredChapters.map((chap) => (
                        <option key={chap.id} value={chap.id}>
                          {chap.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Subtopic (Optional)
                    </label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      disabled={!selectedChapterId}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 disabled:bg-slate-100 shadow-xs"
                    >
                      <option value="">-- All / General Topic --</option>
                      {filteredTopics.map((top) => (
                        <option key={top.id} value={top.id}>
                          {top.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Marks, Negative Marks & Difficulty */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Difficulty Level *
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                    >
                      <option value="easy">Easy (Foundational)</option>
                      <option value="medium">Medium (Standard Entrance)</option>
                      <option value="hard">Hard (Advanced / REAP Level)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Marks for Correct Answer *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={marks}
                      onChange={(e) => setMarks(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Negative Penalty (Incorrect) *
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="5"
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 shadow-xs"
                      required
                    />
                  </div>
                </div>

                {/* 3. Question Statement */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Question Statement (Supports LaTeX Math $...$) *
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {isEditingExisting ? `Editing Question #${activeQuestionIndex + 1}` : `Authoring Question #${currentTestQuestions.length + 1}`}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter the complete question text here. LaTeX formatting like $x^2 + y^2 = r^2$ is supported..."
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm sm:text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                {/* 4. The 4 Options (A, B, C, D) & Answer Key */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      4 Multiple Choice Options (Select the Correct Option Radio Button) *
                    </label>
                    <span className="text-xs font-bold text-emerald-700">
                      Current Correct Key: Option {correctOptionLabel}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["A", "B", "C", "D"] as const).map((label, idx) => {
                      const isCorrect = correctOptionLabel === label;
                      return (
                        <div
                          key={label}
                          className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400"
                              : "border-slate-200 bg-slate-50/50 hover:bg-white"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={isCorrect}
                              onChange={() => setCorrectOptionLabel(label)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                    Step-by-Step Explanation &amp; Solution *
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

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Target Test:</span>
                    <strong className="text-slate-800">{currentTargetTest?.name || "Mock Test"}</strong>
                    {currentTargetTest?.status === "published" ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        ● Published
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        ○ Draft
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Clear / Reset for New Question */}
                    <button
                      type="button"
                      onClick={handleNewQuestionClick}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                      title="Clear form to write another question"
                    >
                      <span className="text-blue-600 font-extrabold text-base leading-none">➕</span>
                      <span>Add New Question</span>
                    </button>

                    {/* Save or Update Question Button */}
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                      title="Save this question, options, and explanation into Supabase"
                    >
                      <span>💾</span>
                      <span>
                        {isPending
                          ? "Saving to Supabase..."
                          : isEditingExisting
                          ? `Update Question #${activeQuestionIndex + 1}`
                          : `Save Question #${currentTestQuestions.length + 1}`}
                      </span>
                    </button>

                    {/* Publish Button */}
                    <button
                      type="button"
                      onClick={handlePublishMockTest}
                      disabled={isPending || !selectedTargetTestId}
                      className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                      title="Publish this mock test so it becomes available for students"
                    >
                      <span>🚀</span>
                      <span>
                        {currentTargetTest?.status === "published" ? "Re-Publish Test" : "Publish Mock Test"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: MY LEARNING (Admin Curriculum Studio & Rich Material Authoring) */}
        {activeTab === "learning" && (
          <div className="mt-6 space-y-4">
            {/* Step-Back Navigation: Return to Mock Tests */}
            <button
              type="button"
              onClick={() => switchTab("tests")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all shadow-2xs"
              title="Go back to Mock Tests (1 step back)"
            >
              <span className="text-sm font-black leading-none">‹</span>
              <span>Back to Mock Tests</span>
            </button>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                    📖 Curriculum &amp; Study Materials Studio
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                    My Learning: Subjects, Chapters &amp; Subtopics
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
                    Configure the official syllabus and author rich learning content: detailed theory explanations, formula cheat-sheets, and PDF/book materials. All content is saved in Supabase and synchronized to the Student portal.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/learning"
                    target="_blank"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs"
                    title="Open the student My Learning page in a new tab"
                  >
                    <span>View Student Portal</span>
                    <span>↗</span>
                  </Link>
                </div>
              </div>

              {/* Status alerts */}
              {learningSuccessMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in">
                  <span>{learningSuccessMessage}</span>
                  <button
                    type="button"
                    onClick={() => setLearningSuccessMessage("")}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}
              {learningErrorMessage && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between animate-in fade-in">
                  <span>⚠️ {learningErrorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setLearningErrorMessage("")}
                    className="text-xs font-bold text-rose-700 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Subject Management */}
              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Subjects</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Add a new subject directly to the Supabase subjects table.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubject((prev) => !prev)}
                    className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-800 active:scale-95 transition-all"
                  >
                    {isAddingSubject ? "Cancel" : "+ Add Subject"}
                  </button>
                </div>

                {isAddingSubject && (
                  <form onSubmit={handleCreateSubject} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
                    <input
                      type="text"
                      placeholder="Subject name"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={newSubjectDescription}
                      onChange={(e) => setNewSubjectDescription(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isPending ? "Saving..." : "Save Subject"}
                    </button>
                  </form>
                )}
              </div>

              {/* Subject Selector Tabs */}
              <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                {adminSubjects.map((sub) => {
                  const chapCount = adminChapters.filter((c) => c.subject_id === sub.id).length;
                  const isSelected = selectedLearningSubjectId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedLearningSubjectId(sub.id)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                        isSelected
                          ? "bg-blue-700 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <span>{sub.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          isSelected ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {chapCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Add Chapter Form */}
              <form onSubmit={handleCreateChapter} className="mt-6 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder={`Add new chapter to ${adminSubjects.find((s) => s.id === selectedLearningSubjectId)?.name || "Subject"}...`}
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  className="w-full sm:w-80 rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                  required
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-800 transition-all"
                >
                  {isPending ? "Adding..." : "+ Add Chapter"}
                </button>
              </form>

              {/* Chapters & Subtopics Grid */}
              <div className="mt-6 space-y-4">
                {adminChapters.filter((c) => c.subject_id === selectedLearningSubjectId).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No chapters added to this subject yet. Use the form above to add one.
                  </p>
                ) : (
                  adminChapters
                    .filter((c) => c.subject_id === selectedLearningSubjectId)
                    .map((chapter) => {
                      const chapterTopics = adminTopics.filter((t) => t.chapter_id === chapter.id);

                      return (
                        <div
                          key={chapter.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                                Chapter
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{chapter.name}</h4>
                              <span className="text-[11px] text-slate-400">
                                ({chapterTopics.length} subtopics)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(chapter.id, chapter.name)}
                              disabled={isPending}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                            >
                              Delete Chapter
                            </button>
                          </div>

                          {/* Subtopics List */}
                          <div className="mt-3">
                            {chapterTopics.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No subtopics added yet.</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {chapterTopics.map((topic) => {
                                  const content = parseTopicLearningContent(topic.description);
                                  const hasNotes = Boolean(content.explanation && content.explanation.trim());
                                  const hasFormulas = Boolean(content.formulas && content.formulas.trim());
                                  const resourceCount = content.resources?.length || 0;

                                  return (
                                    <div
                                      key={topic.id}
                                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs gap-2"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <h5 className="text-xs font-bold text-slate-900 leading-snug">
                                            {topic.name}
                                          </h5>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteTopic(topic.id, topic.name)}
                                            disabled={isPending}
                                            className="text-slate-400 hover:text-rose-600 font-bold text-xs p-0.5"
                                            title="Delete subtopic"
                                          >
                                            ✕
                                          </button>
                                        </div>

                                        {/* Badges showing content added */}
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {hasNotes && (
                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                              📝 Notes
                                            </span>
                                          )}
                                          {hasFormulas && (
                                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                                              ⚡ Formulas
                                            </span>
                                          )}
                                          {resourceCount > 0 && (
                                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                              📚 {resourceCount} Materials
                                            </span>
                                          )}
                                          {!hasNotes && !hasFormulas && resourceCount === 0 && (
                                            <span className="text-[10px] text-slate-400 italic">
                                              No study material added yet
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Action to edit learning material */}
                                      <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-end">
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenTopicEditor(topic)}
                                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100 transition-all flex items-center gap-1"
                                          >
                                            <span>✏️</span>
                                            <span>Edit Notes &amp; Formulas</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openPracticeQuestionEditor(topic)}
                                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1"
                                          >
                                            <span>📝</span>
                                            <span>Add / Edit Practice Questions</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Inline Add Subtopic Form */}
                          <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Add subtopic to ${chapter.name}...`}
                              value={targetChapterIdForTopic === chapter.id ? newTopicName : ""}
                              onFocus={() => setTargetChapterIdForTopic(chapter.id)}
                              onChange={(e) => {
                                setTargetChapterIdForTopic(chapter.id);
                                setNewTopicName(e.target.value);
                              }}
                              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-600"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (targetChapterIdForTopic === chapter.id) {
                                  handleCreateTopic(chapter.id);
                                }
                              }}
                              disabled={isPending || targetChapterIdForTopic !== chapter.id || !newTopicName.trim()}
                              className="rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 active:scale-95 disabled:opacity-40 transition-all"
                            >
                              + Add Subtopic
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* TOPIC PRACTICE QUESTION EDITOR */}
            {practiceTopic && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in">
                <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                        Topic Practice Questions
                      </span>
                      <h3 className="mt-2 text-xl font-black text-slate-900">
                        {practiceTopic.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        View, navigate, add, and edit all practice questions for this topic.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPracticeTopic(null)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  {practiceQuestionsLoading ? (
                    <div className="py-14 text-center">
                      <div className="text-3xl">⏳</div>
                      <p className="mt-3 text-sm font-bold text-slate-700">Loading topic practice questions...</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Question Navigator</p>
                          <p className="text-sm font-black text-slate-900">
                            {practiceEditingId
                              ? `Question ${Math.min(practiceQuestionIndex + 1, practiceQuestions.length)} of ${practiceQuestions.length}`
                              : "New Practice Question"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePracticeQuestionNavigation(practiceQuestionIndex - 1)}
                            disabled={practiceQuestionIndex <= 0 || practiceQuestions.length === 0}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ← Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePracticeQuestionNavigation(practiceQuestionIndex + 1)}
                            disabled={practiceQuestionIndex >= practiceQuestions.length - 1 || practiceQuestions.length === 0}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next →
                          </button>
                          <button
                            type="button"
                            onClick={handleNewPracticeQuestion}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            + New Question
                          </button>
                        </div>
                      </div>

                      {practiceQuestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {practiceQuestions.map((question, index) => (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => handlePracticeQuestionNavigation(index)}
                              className={`h-8 min-w-8 rounded-lg border px-2 text-[11px] font-black transition-all ${
                                practiceEditingId === question.id
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                              }`}
                              title={`Open question ${index + 1}`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {practiceSuccessMessage && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                          {practiceSuccessMessage}
                        </div>
                      )}
                      {practiceErrorMessage && (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                          ⚠️ {practiceErrorMessage}
                        </div>
                      )}

                      <form onSubmit={handleCreatePracticeQuestion} className="mt-5 space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Topic</label>
                            <input
                              value={practiceTopic.name}
                              readOnly
                              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Difficulty</label>
                            <select
                              value={practiceDifficulty}
                              onChange={(e) => setPracticeDifficulty(e.target.value as "easy" | "medium" | "hard")}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Question Statement *</label>
                          <textarea
                            rows={4}
                            value={practiceQuestionText}
                            onChange={(e) => setPracticeQuestionText(e.target.value)}
                            placeholder="Enter the practice question..."
                            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 outline-none focus:border-emerald-600"
                            required
                          />
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Options &amp; Correct Answer *</label>
                            <span className="text-xs font-bold text-emerald-700">Correct: {practiceCorrectOption}</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(["A", "B", "C", "D"] as const).map((label, idx) => {
                              const isCorrect = practiceCorrectOption === label;
                              return (
                                <div
                                  key={label}
                                  className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                                    isCorrect
                                      ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400"
                                      : "border-slate-200 bg-slate-50/50"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="practiceCorrectOption"
                                    checked={isCorrect}
                                    onChange={() => setPracticeCorrectOption(label)}
                                    className="mt-1 h-4 w-4 cursor-pointer"
                                  />
                                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                    isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                                  }`}>
                                    {label}
                                  </span>
                                  <input
                                    type="text"
                                    value={practiceOptions[idx]}
                                    onChange={(e) => handlePracticeOptionChange(idx, e.target.value)}
                                    placeholder={`Option ${label} text...`}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-800 outline-none focus:border-emerald-600"
                                    required
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Marks</label>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={practiceMarks}
                              onChange={(e) => setPracticeMarks(Number(e.target.value))}
                              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-600"
                            />
                            <p className="mt-1 text-[10px] text-slate-400">No negative marking is applied in student practice.</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Solution Explanation *</label>
                            <textarea
                              rows={5}
                              value={practiceExplanation}
                              onChange={(e) => setPracticeExplanation(e.target.value)}
                              placeholder="Enter the explanation that students can open after answering..."
                              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-600"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <p className="text-[11px] text-slate-500">
                            Practice questions are scoped to this topic and are not added to Mock Tests.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPracticeTopic(null)}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isPending ? "Saving..." : practiceEditingId ? "Save Changes" : "Save Practice Question"}
                            </button>
                          </div>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TOPIC RICH CONTENT EDITOR MODAL */}
            {editingTopic && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                        Author Learning Curriculum
                      </span>
                      <h3 className="mt-1.5 text-xl font-black text-slate-900">
                        {editingTopic.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Add comprehensive explanations, formula sheets, reference books, and old exam formula materials.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingTopic(null)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  {/* 1. Subtopic Title */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Subtopic Title
                    </label>
                    <input
                      type="text"
                      value={editTopicName}
                      onChange={(e) => setEditTopicName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  {/* 2. Detailed Explanation & Theory */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Detailed Explanation &amp; Theory Notes
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Supports LaTeX $...$ &amp; multi-line formatted text
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editExplanation}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      placeholder="Enter detailed concept explanations, core theorems, step-by-step methodologies, and derivation notes..."
                      className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* 3. Formulas & Key Rules / Short-cuts */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Formulas, Key Equations &amp; Short-cuts
                      </label>
                      <span className="text-[11px] text-slate-500">Formula Cheat-Sheet</span>
                    </div>
                    <textarea
                      rows={5}
                      value={editFormulas}
                      onChange={(e) => setEditFormulas(e.target.value)}
                      placeholder="Enter standard formulas, shortcuts, speed math tricks, and essential identities for rapid problem solving..."
                      className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 text-sm font-mono text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* 4. PDFs, Reference Books & Old Exam Materials */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                          PDFs, Reference Books &amp; Old Exam Materials
                        </label>
                        <p className="text-[11px] text-slate-500">
                          Add links to PDF textbooks, formula booklets, or reference documents for students.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddResourceRow}
                        className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span>+ Add Material</span>
                      </button>
                    </div>

                    {editResources.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No materials attached yet. Click &quot;+ Add Material&quot; to link PDFs, books, or formula guides.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {editResources.map((res, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                          >
                            <select
                              value={res.type}
                              onChange={(e) =>
                                handleUpdateResourceRow(idx, "type", e.target.value)
                              }
                              className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 outline-none"
                            >
                              <option value="pdf">📄 PDF Document</option>
                              <option value="book">📖 Reference Book</option>
                              <option value="formula_sheet">⚡ Formula Sheet</option>
                              <option value="notes">📝 Revision Notes</option>
                            </select>

                            <input
                              type="text"
                              value={res.title}
                              onChange={(e) =>
                                handleUpdateResourceRow(idx, "title", e.target.value)
                              }
                              placeholder="Title (e.g. HC Verma Concepts Ch. 3 PDF)"
                              className="flex-1 min-w-[150px] rounded-md border border-slate-200 p-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                            />

                            <input
                              type="url"
                              value={res.url}
                              onChange={(e) =>
                                handleUpdateResourceRow(idx, "url", e.target.value)
                              }
                              placeholder="URL (https://...)"
                              className="flex-1 min-w-[150px] rounded-md border border-slate-200 p-2 text-xs text-slate-800 outline-none focus:border-blue-600"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveResourceRow(idx)}
                              className="text-slate-400 hover:text-rose-600 font-bold text-xs p-1"
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingTopic(null)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTopicContent}
                      disabled={isSavingTopicContent}
                      className="rounded-xl bg-blue-700 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      <span>💾</span>
                      <span>{isSavingTopicContent ? "Saving to Supabase..." : "Save to Supabase & Sync"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ADMIN USERS ROLES */}
        {activeTab === "admins" && (
          <div className="mt-6 space-y-4">
            {/* Step-Back Navigation: Return to Mock Tests */}
            <button
              type="button"
              onClick={() => switchTab("tests")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all shadow-2xs"
              title="Go back to Mock Tests (1 step back)"
            >
              <span className="text-sm font-black leading-none">‹</span>
              <span>Back to Mock Tests</span>
            </button>

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
