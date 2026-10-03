"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { parseTopicLearningContent, type LearningResource } from "@/lib/learning/topic-content";
import type { SubjectWithHierarchy } from "@/lib/content/queries";
import type { Topic } from "@/types/content";

interface StudentLearningViewProps {
  subjects: SubjectWithHierarchy[];
}

export function StudentLearningView({ subjects }: StudentLearningViewProps) {
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<{
    topic: Topic;
    chapterName: string;
    subjectName: string;
    subjectSlug: string;
  } | null>(null);

  const [activeModalTab, setActiveModalTab] = useState<"explanation" | "formulas" | "resources">("explanation");

  const selectedTopicRef = useRef(selectedTopic);
  selectedTopicRef.current = selectedTopic;

  // Intercept back navigation so mobile phone gestures / back buttons come back 1 step instead of exiting app
  useEffect(() => {
    window.history.pushState({ learningPortal: true }, "");

    const onPopState = () => {
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

  return (
    <div className="space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-6">
        {/* Step-Back: Return to Dashboard */}
        <div className="mb-3">
          <Link
            href="/dashboard"
            prefetch={true}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
            title="Return to Student Dashboard (1 step back)"
          >
            <span className="text-sm font-black leading-none">‹</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

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
            <span className="text-sm font-black text-slate-900">{totalTopics} Subtopics</span>
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
                          <span className="text-[11px] font-semibold text-slate-400">
                            {chapter.topics?.length || 0} subtopics
                          </span>
                        </div>

                        <h3 className="mt-2 text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {chapter.name}
                        </h3>

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
                                    <span className="text-slate-400 group-hover:text-blue-600 font-bold text-xs">
                                      &rarr;
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
      {/* RICH STUDY MATERIAL READER MODAL (FOR STUDENTS) */}
      {/* ========================================================================= */}
      {selectedTopic && activeTopicContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 mb-2"
                >
                  <span className="text-sm font-black leading-none">‹</span>
                  <span>Back to Topics List</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                    {selectedTopic.subjectName}
                  </span>
                  <span className="text-xs text-slate-400">&bull;</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedTopic.chapterName}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 leading-tight">
                  {selectedTopic.topic.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs within Modal: Explanations | Formulas | Books & PDFs */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveModalTab("explanation")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === "explanation"
                    ? "border-blue-700 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>📝</span>
                <span>Detailed Explanation</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("formulas")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === "formulas"
                    ? "border-blue-700 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>⚡</span>
                <span>Formulas &amp; Rules</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("resources")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeModalTab === "resources"
                    ? "border-blue-700 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>📚</span>
                <span>PDFs &amp; Books</span>
                {activeTopicContent.resources && activeTopicContent.resources.length > 0 && (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px]">
                    {activeTopicContent.resources.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Detailed Explanations & Theory Notes */}
            {activeModalTab === "explanation" && (
              <div className="space-y-4 animate-in fade-in">
                {activeTopicContent.explanation && activeTopicContent.explanation.trim() ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-5 text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {activeTopicContent.explanation}
                  </div>
                ) : activeTopicContent.summary ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm sm:text-base text-slate-700 leading-relaxed">
                    <p className="font-semibold text-slate-900 mb-1">Topic Summary:</p>
                    {activeTopicContent.summary}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <span className="text-3xl">📝</span>
                    <h4 className="mt-2 text-sm font-bold text-slate-700">No detailed theory notes added yet</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Administrators are updating the syllabus notes for this topic. Check back shortly.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Formulas & Key Rules */}
            {activeModalTab === "formulas" && (
              <div className="space-y-4 animate-in fade-in">
                {activeTopicContent.formulas && activeTopicContent.formulas.trim() ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-900">
                        Formula Cheat-Sheet &amp; Shortcuts
                      </span>
                    </div>
                    <pre className="font-mono text-xs sm:text-sm text-slate-900 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-white p-4 rounded-lg border border-amber-200">
                      {activeTopicContent.formulas}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <span className="text-3xl">⚡</span>
                    <h4 className="mt-2 text-sm font-bold text-slate-700">No formula sheet added yet</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Formula rules and speed math shortcuts will appear here once configured by the admin.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PDFs, Reference Books & Old Exam Materials */}
            {activeModalTab === "resources" && (
              <div className="space-y-4 animate-in fade-in">
                {activeTopicContent.resources && activeTopicContent.resources.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      Download or access reference materials and previous year formulas linked to this topic:
                    </p>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {activeTopicContent.resources.map((res: LearningResource, idx: number) => {
                        const icon =
                          res.type === "pdf"
                            ? "📄"
                            : res.type === "book"
                            ? "📖"
                            : res.type === "formula_sheet"
                            ? "⚡"
                            : "📝";

                        const typeLabel =
                          res.type === "pdf"
                            ? "PDF Document"
                            : res.type === "book"
                            ? "Reference Book"
                            : res.type === "formula_sheet"
                            ? "Formula Sheet"
                            : "Notes";

                        return (
                          <div
                            key={idx}
                            className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-4 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl border border-blue-100">
                                {icon}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                  {res.title}
                                </h4>
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                  {typeLabel}
                                </span>
                              </div>
                            </div>

                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-blue-800 transition-all flex items-center gap-1.5"
                            >
                              <span>Open / Download</span>
                              <span>↗</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <span className="text-3xl">📚</span>
                    <h4 className="mt-2 text-sm font-bold text-slate-700">No PDF or book materials linked</h4>
                    <p className="mt-1 text-xs text-slate-400">
                      External reference books, PDFs, and PYQ materials will appear here once uploaded by administrators.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Official IIITH Entrance Preparation Syllabus
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href="/tests"
                  prefetch={true}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-700/20 hover:bg-blue-800 transition-all"
                >
                  Take Practice Mock Test &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

