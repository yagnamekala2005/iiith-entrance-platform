"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { parseTopicLearningContent, type LearningResource } from "@/lib/learning/topic-content";
import { checkTopicPracticeAnswer, getTopicPracticeQuestions, type PracticeQuestion } from "@/lib/practice/actions";
import type { LearningProgress, SubjectWithHierarchy } from "@/lib/content/queries";
import { markTopicCompleted } from "@/lib/learning/progress-actions";
import type { Topic } from "@/types/content";

interface StudentLearningViewProps {
  subjects: SubjectWithHierarchy[];
  learningProgress: LearningProgress;
}

export function StudentLearningView({ subjects, learningProgress }: StudentLearningViewProps) {
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<{
    topic: Topic;
    chapterName: string;
    subjectName: string;
    subjectSlug: string;
  } | null>(null);

  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(
    learningProgress.completedTopicIds
  );
  const [completingTopicId, setCompletingTopicId] = useState<string | null>(null);
  const [learningPercentage, setLearningPercentage] = useState<number>(learningProgress.percentage);
  const topicReaderRef = useRef<HTMLDivElement | null>(null);

  // Topic Practice Session State
  const [practiceTopic, setPracticeTopic] = useState<{
    topic: Topic;
    chapterName: string;
    subjectName: string;
  } | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState<number>(0);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState<string>("");
  const [practiceAnswerResult, setPracticeAnswerResult] = useState<{
    correct: boolean;
    correctOption: { id: string; option_label: string; option_text: string } | null;
  } | null>(null);
  const [practiceShowExplanation, setPracticeShowExplanation] = useState<boolean>(false);
  const [practiceLoading, setPracticeLoading] = useState<boolean>(false);
  const [practiceError, setPracticeError] = useState<string>("");
  const [practiceCompleted, setPracticeCompleted] = useState<boolean>(false);

  const selectedTopicRef = useRef<typeof selectedTopic>(selectedTopic);
  const practiceTopicRef = useRef<typeof practiceTopic>(practiceTopic);

  useEffect(() => {
    practiceTopicRef.current = practiceTopic;
  }, [practiceTopic]);

  useEffect(() => {
    if (!selectedTopic) return;
    const reader = topicReaderRef.current;
    if (!reader) return;
    reader.scrollTop = 0;
  }, [selectedTopic]);

  useEffect(() => {
    selectedTopicRef.current = selectedTopic;
  }, [selectedTopic]);

  // Intercept back navigation so mobile phone gestures / back buttons come back 1 step instead of exiting app
  useEffect(() => {
    window.history.pushState({ learningPortal: true }, "");

    const onPopState = () => {
      // If a topic practice session is open, close it (1 step back)
      if (practiceTopicRef.current) {
        setPracticeTopic(null);
        setPracticeQuestions([]);
        setPracticeIndex(0);
        setPracticeCompleted(false);
        window.history.pushState({ learningPortal: true }, "");
        return;
      }

      // If a topic reader modal is open, close it (1 step back)
      if (selectedTopicRef.current) {
        setSelectedTopic(null);
        window.history.pushState({ learningPortal: true }, "");
        return;
      }

      // If already on the learning page, safely navigate back to dashboard instead of exiting app!
      window.location.href = "/dashboard";
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const openTopicModal = (topicData: {
    topic: Topic;
    chapterName: string;
    subjectName: string;
    subjectSlug: string;
  }) => {
    setSelectedTopic(topicData);
    window.history.pushState({ topicModal: topicData.topic.id }, "");
  };

  const handlePracticeOptionSelect = async (optionId: string) => {
    if (!practiceQuestions[practiceIndex] || practiceSelectedOption || practiceLoading) return;

    const question = practiceQuestions[practiceIndex];
    setPracticeSelectedOption(optionId);
    setPracticeShowExplanation(false);

    const result = await checkTopicPracticeAnswer(question.id, optionId);

    if (result.success) {
      setPracticeAnswerResult({
        correct: result.correct,
        correctOption: result.correctOption,
      });
    } else {
      setPracticeAnswerResult(null);
      setPracticeError(result.error || "Unable to check this answer.");
    }
  };

  const handlePreviousPracticeQuestion = () => {
    if (practiceIndex <= 0) return;

    setPracticeIndex((prev) => prev - 1);
    setPracticeSelectedOption("");
    setPracticeAnswerResult(null);
    setPracticeShowExplanation(false);
    setPracticeError("");
  };

  const handleNextPracticeQuestion = () => {
    if (practiceIndex >= practiceQuestions.length - 1) {
      setPracticeCompleted(true);
      return;
    }

    setPracticeIndex((prev) => prev + 1);
    setPracticeSelectedOption("");
    setPracticeAnswerResult(null);
    setPracticeShowExplanation(false);
    setPracticeError("");
  };

  const subjectMeta: Record<
    string,
    { icon: string; badgeClass: string; borderClass: string; bgClass: string }
  > = {
    mathematics: {
      icon: "📐",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      borderClass: "border-blue-200",
      bgClass: "from-blue-50/50 to-indigo-50/30",
    },
    physics: {
      icon: "⚡",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      borderClass: "border-amber-200",
      bgClass: "from-amber-50/50 to-yellow-50/30",
    },
    chemistry: {
      icon: "🧪",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      borderClass: "border-emerald-200",
      bgClass: "from-emerald-50/50 to-teal-50/30",
    },
    "aptitude-reasoning": {
      icon: "🧠",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
      borderClass: "border-purple-200",
      bgClass: "from-purple-50/50 to-pink-50/30",
    },
  };

  // Filter subjects based on user selection
  const filteredSubjects = useMemo(() => {
    if (selectedSubjectSlug === "all") return subjects;
    return subjects.filter((s) => s.slug === selectedSubjectSlug);
  }, [subjects, selectedSubjectSlug]);

  // Active topic parsed content
  const activeTopicContent = useMemo(() => {
    if (!selectedTopic) return null;
    return parseTopicLearningContent(selectedTopic.topic.description);
  }, [selectedTopic]);

  const allTopics = useMemo(
    () =>
      subjects.flatMap((subject) =>
        (subject.chapters || []).flatMap((chapter) =>
          (chapter.topics || []).map((topic) => ({
            topic,
            chapterName: chapter.name,
            subjectName: subject.name,
            subjectSlug: subject.slug,
          })),
        ),
      ),
    [subjects],
  );

  const nextTopic = useMemo(() => {
    if (!selectedTopic) return null;
    const currentIndex = allTopics.findIndex((item) => item.topic.id === selectedTopic.topic.id);
    return currentIndex >= 0 && currentIndex < allTopics.length - 1
      ? allTopics[currentIndex + 1]
      : null;
  }, [allTopics, selectedTopic]);

  const completeCurrentTopic = async () => {
    if (!selectedTopic || completedTopicIds.includes(selectedTopic.topic.id) || completingTopicId) {
      return;
    }

    setCompletingTopicId(selectedTopic.topic.id);
    const result = await markTopicCompleted(selectedTopic.topic.id);

    if (result.success) {
      setCompletedTopicIds((prev) =>
        prev.includes(selectedTopic.topic.id) ? prev : [...prev, selectedTopic.topic.id],
      );
      if (typeof result.percentage === "number") {
        setLearningPercentage(result.percentage);
      }
    }

    setCompletingTopicId(null);
  };

  const handleTopicReaderScroll = () => {
    const reader = topicReaderRef.current;
    if (!reader || !selectedTopic) return;

    const reachedBottom =
      reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 8;

    if (reachedBottom) {
      void completeCurrentTopic();
    }
  };

  useEffect(() => {
    if (!selectedTopic) return;

    const reader = topicReaderRef.current;
    if (!reader) return;

    const checkInitialBottom = () => {
      if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 8) {
        void completeCurrentTopic();
      }
    };

    const timer = window.setTimeout(checkInitialBottom, 100);
    window.addEventListener("resize", checkInitialBottom);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", checkInitialBottom);
    };
  }, [selectedTopic, activeTopicContent]);

  // Counts across platform
  const totalChapters = useMemo(
    () => subjects.reduce((acc, s) => acc + (s.chapters?.length || 0), 0),
    [subjects]
  );
  const totalTopics = useMemo(
    () =>
      subjects.reduce(
        (acc, s) =>
          acc +
          (s.chapters || []).reduce((cAcc, c) => cAcc + (c.topics?.length || 0), 0),
        0
      ),
    [subjects]
  );

  const completedTopicsCount = completedTopicIds.length;

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                📖 IIITH Entrance Syllabus &amp; Study Notes
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                Synced with Admin
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              My Learning: Curriculum &amp; Formula Books
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600">
              Access comprehensive theory notes, formula sheets, reference books, and old exam materials curated by professors and platform administrators. Click any topic below to open its full study view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/tests"
              prefetch={true}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 active:scale-95 transition-all"
            >
              Take Timed Mock Test &rarr;
            </Link>
          </div>
        </div>

        {/* Learning Progress */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Learning Progress
              </span>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {completedTopicsCount} of {totalTopics} topics completed
              </p>
            </div>
            <span className="text-2xl font-black text-blue-700">{learningPercentage}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-500"
              style={{ width: `${learningPercentage}%` }}
            />
          </div>
        </div>

        {/* Global Stats Summary Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-6 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-xs font-semibold text-slate-600 shadow-2xs">
          <div>
            <span className="text-slate-400 uppercase text-[10px] block">Subjects</span>
            <span className="text-sm font-black text-slate-900">{subjects.length} Disciplines</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] block">Chapters</span>
            <span className="text-sm font-black text-slate-900">{totalChapters} Chapters</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] block">Subtopics</span>
            <span className="text-sm font-black text-slate-900">{totalTopics} Topics</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Subject Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSelectedSubjectSlug("all")}
            className={`rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all ${
              selectedSubjectSlug === "all"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Subjects ({subjects.length})
          </button>

          {subjects.map((sub) => {
            const meta = subjectMeta[sub.slug] || { icon: "📚" };
            const isSelected = selectedSubjectSlug === sub.slug;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubjectSlug(sub.slug)}
                className={`rounded-xl px-3 sm:px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-700 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{meta.icon}</span>
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search topics, formulas, books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Subjects & Chapters Curriculum List */}
      <div className="space-y-8">
        {filteredSubjects.map((subject) => {
          const meta = subjectMeta[subject.slug] || {
            icon: "📚",
            badgeClass: "bg-slate-50 text-slate-800 border-slate-200",
            borderClass: "border-slate-200",
            bgClass: "from-slate-50 to-white",
          };

          // Filter chapters by search query if applicable
          const query = searchQuery.trim().toLowerCase();
          const filteredChapters = (subject.chapters || []).filter((chap) => {
            if (!query) return true;
            if (chap.name.toLowerCase().includes(query)) return true;
            return (chap.topics || []).some(
              (t) =>
                t.name.toLowerCase().includes(query) ||
                (t.description && t.description.toLowerCase().includes(query))
            );
          });

          if (query && filteredChapters.length === 0) {
            return null;
          }

          return (
            <div
              key={subject.id}
              className={`rounded-2xl border ${meta.borderClass} bg-white p-5 sm:p-7 shadow-xs transition-all`}
            >
              {/* Subject Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl shadow-xs">
                    {meta.icon}
                  </span>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">{subject.name}</h2>
                    <span className="text-xs text-slate-500 font-medium">
                      {subject.chapters?.length || 0} Chapters &bull;{" "}
                      {subject.chapters?.reduce((acc, c) => acc + (c.topics?.length || 0), 0) || 0} Subtopics
                    </span>
                  </div>
                </div>

                <span className={`rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                  Core Discipline
                </span>
              </div>

              {/* Chapters & Subtopics Grid */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredChapters.length === 0 ? (
                  <p className="text-xs text-slate-400 italic col-span-full">
                    No chapters configured for this subject yet.
                  </p>
                ) : (
                  filteredChapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200">
                            Chapter
                          </span>
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${completedChapterIds.includes(chapter.id) ? "text-emerald-700" : "text-slate-400"}`}>
                            {completedChapterIds.includes(chapter.id) && <span className="text-sm">✓</span>}
                            {completedChapterIds.includes(chapter.id) ? "Completed" : `${chapter.topics?.length || 0} subtopics`}
                          </span>
                        </div>

                        <div className="mt-2 flex items-start justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {chapter.name}
                          </h3>
                          {completedChapterIds.includes(chapter.id) && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                              ✓
                            </span>
                          )}
                        </div>

                        {/* Subtopics List as Interactive Cards */}
                        <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3">
                          {(!chapter.topics || chapter.topics.length === 0) ? (
                            <p className="text-[11px] text-slate-400 italic">No subtopics added yet.</p>
                          ) : (
                            chapter.topics.map((topic) => {
                              const content = parseTopicLearningContent(topic.description);
                              const hasNotes = Boolean(content.explanation && content.explanation.trim());
                              const hasFormulas = Boolean(content.formulas && content.formulas.trim());
                              const resourceCount = content.resources?.length || 0;

                              const isTopicCompleted = completedTopicIds.includes(topic.id);

                              return (
                                <button
                                  key={topic.id}
                                  type="button"
                                  onClick={() =>
                                    openTopicModal({
                                      topic,
                                      chapterName: chapter.name,
                                      subjectName: subject.name,
                                      subjectSlug: subject.slug,
                                    })
                                  }
                                  className="w-full text-left rounded-lg border border-slate-200 bg-white p-2.5 transition-all hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-2xs active:scale-[0.99] group"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900">
                                      {topic.name}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold">
                                      {isTopicCompleted ? (
                                        <span className="text-emerald-600">✓ Completed</span>
                                      ) : (
                                        <span className="text-slate-400 group-hover:text-blue-600">&rarr;</span>
                                      )}
                                    </span>
                                  </div>

                                  {/* Badges for study material availability */}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    {hasNotes && (
                                      <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 border border-blue-200">
                                        📝 Notes
                                      </span>
                                    )}
                                    {hasFormulas && (
                                      <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 border border-amber-200">
                                        ⚡ Formulas
                                      </span>
                                    )}
                                    {resourceCount > 0 && (
                                      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                        📚 {resourceCount} Materials
                                      </span>
                                    )}
                                    {!hasNotes && !hasFormulas && resourceCount === 0 && (
                                      <span className="text-[10px] text-slate-400 italic">
                                        Click to view overview
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* FULL-PAGE TOPIC LEARNING READER */}
      {/* ========================================================================= */}
      {selectedTopic && activeTopicContent && (
        <div className="fixed inset-0 z-50 bg-slate-50 animate-in fade-in">
          <div
            ref={topicReaderRef}
            onScroll={handleTopicReaderScroll}
            className="h-full w-full overflow-y-auto"
          >
            <div className="mx-auto min-h-full w-full max-w-5xl bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
              <div className="sticky top-0 z-10 -mx-5 mb-8 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    <span className="text-base font-black">‹</span>
                    <span>Back to Topics</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                      {selectedTopic.subjectName}
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:inline">•</span>
                    <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
                      {selectedTopic.chapterName}
                    </span>
                  </div>

                  <span className="text-xs font-black text-blue-700">
                    {learningPercentage}% Overall
                  </span>
                </div>
              </div>

              <article className="pb-20">
                <div className="border-b border-slate-200 pb-8">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                    {selectedTopic.subjectName} · {selectedTopic.chapterName}
                  </p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                    {selectedTopic.topic.name}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
                    Read the complete topic content. The topic is automatically marked as completed when you reach the bottom of this page.
                  </p>
                </div>

                <section className="mt-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-800 border border-blue-200">
                      Detailed Explanation
                    </span>
                  </div>
                  {activeTopicContent.explanation && activeTopicContent.explanation.trim() ? (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-6 text-sm leading-8 text-slate-800 whitespace-pre-wrap sm:p-8 sm:text-base">
                      {activeTopicContent.explanation}
                    </div>
                  ) : activeTopicContent.summary ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-8 text-slate-700 sm:p-8 sm:text-base">
                      <p className="mb-2 font-black text-slate-900">Topic Summary</p>
                      {activeTopicContent.summary}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                      <span className="text-3xl">📝</span>
                      <p className="mt-2 text-sm font-bold text-slate-700">No detailed theory notes added yet.</p>
                    </div>
                  )}
                </section>

                <section className="mt-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 border border-amber-200">
                      Formulas &amp; Key Rules
                    </span>
                  </div>
                  {activeTopicContent.formulas && activeTopicContent.formulas.trim() ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-amber-200 bg-amber-50/30 p-6 font-mono text-sm leading-7 text-slate-900 sm:p-8">
                      {activeTopicContent.formulas}
                    </pre>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <p className="text-sm font-bold text-slate-700">No formula sheet added yet.</p>
                    </div>
                  )}
                </section>

                <section className="mt-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-200">
                      PDFs &amp; Reference Materials
                    </span>
                  </div>
                  {activeTopicContent.resources && activeTopicContent.resources.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                      {activeTopicContent.resources.map((res: LearningResource, idx: number) => {
                        const icon =
                          res.type === "pdf"
                            ? "📄"
                            : res.type === "book"
                            ? "📖"
                            : res.type === "formula_sheet"
                            ? "⚡"
                            : "📝";

                        return (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-4 p-5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl border border-blue-100">
                                {icon}
                              </span>
                              <div>
                                <h3 className="text-sm font-bold text-slate-900">{res.title}</h3>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                  {res.type.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800"
                            >
                              Open / Download ↗
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <p className="text-sm font-bold text-slate-700">No PDF or book materials linked.</p>
                    </div>
                  )}
                </section>

                <div className="mt-14 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  {completedTopicIds.includes(selectedTopic.topic.id) ? (
                    <>
                      <p className="text-sm font-black text-emerald-800">✓ Topic Completed</p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Your completion has been saved to your learning progress.
                      </p>
                    </>
                  ) : completingTopicId === selectedTopic.topic.id ? (
                    <>
                      <p className="text-sm font-black text-emerald-800">Saving completion...</p>
                      <p className="mt-1 text-xs text-emerald-700">Your progress is being saved.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-emerald-800">Almost there</p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Scroll to the very bottom to automatically complete this topic.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic(null)}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                  >
                    Back to Topics
                  </button>

                  {nextTopic ? (
                    <button
                      type="button"
                      disabled={!completedTopicIds.includes(selectedTopic.topic.id)}
                      onClick={() => {
                        openTopicModal(nextTopic);
                        topicReaderRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                      }}
                      className="rounded-xl bg-blue-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next Topic →
                    </button>
                  ) : (
                    <span className="rounded-xl bg-emerald-100 px-6 py-3 text-xs font-black uppercase tracking-wider text-emerald-800">
                      ✓ All Topics Completed
                    </span>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOPIC PRACTICE SESSION */}
      {/* ========================================================================= */}
      {practiceTopic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                  Topic Practice
                </span>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {practiceTopic.topic.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {practiceTopic.subjectName} · {practiceTopic.chapterName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPracticeTopic(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Close practice"
              >
                ✕
              </button>
            </div>

            {practiceLoading ? (
              <div className="py-16 text-center">
                <div className="text-3xl">⏳</div>
                <p className="mt-3 text-sm font-bold text-slate-700">Loading practice questions...</p>
              </div>
            ) : practiceError && practiceQuestions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl">📝</div>
                <h4 className="mt-3 text-base font-bold text-slate-800">No Practice Questions Available</h4>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">{practiceError}</p>
                <button
                  type="button"
                  onClick={() => setPracticeTopic(null)}
                  className="mt-5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                >
                  Back to Topic
                </button>
              </div>
            ) : practiceCompleted ? (
              <div className="py-14 text-center">
                <div className="text-5xl">🎉</div>
                <h4 className="mt-3 text-2xl font-black text-slate-900">Practice Complete</h4>
                <p className="mt-2 text-sm text-slate-500">
                  You completed all {practiceQuestions.length} questions from {practiceTopic.topic.name}.
                </p>
                <button
                  type="button"
                  onClick={() => setPracticeTopic(null)}
                  className="mt-6 rounded-xl bg-blue-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800"
                >
                  Back to Topic
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Practice Question</span>
                    <p className="text-sm font-black text-slate-900">
                      Question {practiceIndex + 1} of {practiceQuestions.length}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200">
                    No Timer
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                  <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-900 whitespace-pre-wrap">
                    {practiceQuestions[practiceIndex]?.question_text}
                  </p>

                  <div className="mt-6 space-y-3">
                    {practiceQuestions[practiceIndex]?.options.map((option) => {
                      const selected = practiceSelectedOption === option.id;
                      const isCorrectOption =
                        practiceAnswerResult?.correctOption?.id === option.id;

                      let optionClass = "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50";
                      if (practiceAnswerResult) {
                        if (isCorrectOption) {
                          optionClass = "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400";
                        } else if (selected && !practiceAnswerResult.correct) {
                          optionClass = "border-rose-500 bg-rose-50 ring-1 ring-rose-400";
                        } else {
                          optionClass = "border-slate-200 bg-slate-50 opacity-80";
                        }
                      } else if (selected) {
                        optionClass = "border-blue-500 bg-blue-50 ring-1 ring-blue-400";
                      }

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={Boolean(practiceSelectedOption)}
                          onClick={() => handlePracticeOptionSelect(option.id)}
                          className={`w-full rounded-xl border p-4 text-left transition-all ${optionClass} disabled:cursor-default`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                              isCorrectOption
                                ? "bg-emerald-600 text-white"
                                : selected && practiceAnswerResult && !practiceAnswerResult.correct
                                ? "bg-rose-600 text-white"
                                : "bg-white border border-slate-300 text-slate-700"
                            }`}>
                              {option.option_label}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{option.option_text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {practiceAnswerResult && (
                    <div className={`mt-5 rounded-xl border p-4 ${
                      practiceAnswerResult.correct
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`text-sm font-black ${
                            practiceAnswerResult.correct ? "text-emerald-800" : "text-rose-800"
                          }`}>
                            {practiceAnswerResult.correct ? "✅ Correct Answer" : "❌ Incorrect Answer"}
                          </p>
                          {!practiceAnswerResult.correct && practiceAnswerResult.correctOption && (
                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              Correct answer: {practiceAnswerResult.correctOption.option_label}. {practiceAnswerResult.correctOption.option_text}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setPracticeShowExplanation((prev) => !prev)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {practiceShowExplanation ? "Hide Explanation" : "💡 View Explanation"}
                        </button>
                      </div>

                      {practiceShowExplanation && (
                        <div className="mt-4 border-t border-slate-200/70 pt-4">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Solution Explanation</p>
                          <div className="mt-2 rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {practiceQuestions[practiceIndex]?.explanation || "No explanation was provided."}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {practiceError && (
                    <p className="mt-3 text-xs font-semibold text-rose-700">{practiceError}</p>
                  )}

                  {practiceQuestions.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handlePreviousPracticeQuestion}
                        disabled={practiceIndex === 0}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Previous Question
                      </button>

                      <div className="flex items-center gap-1.5">
                        {practiceQuestions.map((question, index) => (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => {
                              if (index === practiceIndex) return;
                              setPracticeIndex(index);
                              setPracticeSelectedOption("");
                              setPracticeAnswerResult(null);
                              setPracticeShowExplanation(false);
                              setPracticeError("");
                            }}
                            className={`h-7 min-w-7 rounded-md border px-1.5 text-[10px] font-black transition-all ${
                              index === practiceIndex
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                            }`}
                            title={`Question ${index + 1}`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleNextPracticeQuestion}
                        disabled={!practiceAnswerResult}
                        className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-800"
                      >
                        {practiceIndex === practiceQuestions.length - 1 ? "Finish Practice" : "Next Question →"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

