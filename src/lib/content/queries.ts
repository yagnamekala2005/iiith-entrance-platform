import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Exam,
  ExamSection,
  Subject,
  Chapter,
  Topic,
  QuestionWithDetails,
  TestWithDetails,
  TestSection,
  TestQuestion,
} from "@/types/content";

export interface SubjectWithHierarchy extends Subject {
  chapters: (Chapter & {
    topics: Topic[];
  })[];
}

/**
 * Fetch all published exams (memoized with React cache)
 */
export const getPublishedExams = cache(async (): Promise<Exam[]> => {
  try {
    const supabase = await createClient();

    // Only expose exams that actually exist in Supabase and have at least
    // one published test. No hardcoded/fallback exam names are used.
    const { data: exams, error } = await supabase
      .from("exams")
      .select("*")
      .eq("published", true)
      .order("name", { ascending: true });

    if (error || !exams || exams.length === 0) {
      return [];
    }

    const { data: publishedTests } = await supabase
      .from("tests")
      .select("exam_id")
      .eq("status", "published")
      .in("exam_id", exams.map((exam) => exam.id));

    const activeExamIds = new Set(
      (publishedTests || []).map((test) => test.exam_id).filter(Boolean),
    );

    return exams.filter((exam) => activeExamIds.has(exam.id));
  } catch {
    return [];
  }
});

/**
 * Fetch a single published exam by slug along with its published sections (memoized)
 */
export const getExamBySlug = cache(async (slug: string): Promise<(Exam & { sections: ExamSection[] }) | null> => {
  try {
    const supabase = await createClient();

    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (examError || !exam) {
      return null;
    }

    const { data: sections } = await supabase
      .from("exam_sections")
      .select("*")
      .eq("exam_id", exam.id)
      .eq("published", true)
      .order("display_order", { ascending: true });

    return {
      ...exam,
      sections: sections || [],
    };
  } catch {
    return null;
  }
});

/**
 * Fetch exam sections by exam ID (memoized)
 */
export const getExamSections = cache(async (examId: string): Promise<ExamSection[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("exam_sections")
      .select("*")
      .eq("exam_id", examId)
      .eq("published", true)
      .order("display_order", { ascending: true });

    if (error || !data) {
      return [];
    }
    return data;
  } catch {
    return [];
  }
});

/**
 * Fetch full subject hierarchy: Subject -> Chapters -> Topics (memoized)
 */
export const getSubjectsWithHierarchy = cache(async (): Promise<SubjectWithHierarchy[]> => {
  const supabase = await createClient();
  const [
    { data: subjects, error: subError },
    { data: chapters },
    { data: topics },
  ] = await Promise.all([
    supabase.from("subjects").select("*").order("display_order", { ascending: true }),
    supabase.from("chapters").select("*").order("display_order", { ascending: true }),
    supabase.from("topics").select("*").order("display_order", { ascending: true }),
  ]);

  if (subError || !subjects) {
    return [];
  }

  const chaptersMap = new Map<string, (Chapter & { topics: Topic[] })[]>();

  (chapters || []).forEach((chap) => {
    const chapTopics = (topics || []).filter((top) => top.chapter_id === chap.id);
    const existing = chaptersMap.get(chap.subject_id) || [];
    existing.push({ ...chap, topics: chapTopics });
    chaptersMap.set(chap.subject_id, existing);
  });

  return subjects.map((sub) => ({
    ...sub,
    chapters: chaptersMap.get(sub.id) || [],
  }));
});

/**
 * Fetch a single topic with its chapter, subject, and question count
 */
export async function getTopicBySlug(topicSlug: string): Promise<(Topic & { chapter: Chapter; subject: Subject; questionCount: number }) | null> {
  const supabase = await createClient();
  const { data: topic, error: topError } = await supabase
    .from("topics")
    .select("*")
    .eq("slug", topicSlug)
    .maybeSingle();

  if (topError || !topic) return null;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", topic.chapter_id)
    .single();

  if (!chapter) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", chapter.subject_id)
    .single();

  if (!subject) return null;

  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", topic.id)
    .eq("status", "published");

  return {
    ...topic,
    chapter,
    subject,
    questionCount: count || 0,
  };
}

export interface QuestionFilters {
  examSlug?: string;
  sectionSlug?: string;
  topicSlug?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

const OLD_TEST_IDS = new Set([
  "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
  "64a2c6a7-77eb-426e-bc3f-c492865aac77",
  "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
]);

/**
 * Fetch published questions linked to active mock tests (Security: Answer keys are NEVER queried or returned).
 * Deduplicates questions by text and ensures only questions from active published mock tests are visible.
 */
export async function getPublishedQuestions(filters: QuestionFilters = {}): Promise<QuestionWithDetails[]> {
  const supabase = await createClient();

  // 1. Find all active published tests (excluding legacy sample tests)
  const { data: publishedTests } = await supabase
    .from("tests")
    .select("id, exam:exams!inner(published)")
    .eq("status", "published")
    .eq("exam.published", true);

  const validTestIds = (publishedTests || [])
    .map((t) => t.id)
    .filter((id) => !OLD_TEST_IDS.has(id));

  // If no published mock test exists, return empty array immediately (no duplicate / orphan questions)
  if (validTestIds.length === 0) {
    return [];
  }

  // 2. Get questions linked to active published tests
  const { data: testQuestions } = await supabase
    .from("test_questions")
    .select("question_id")
    .in("test_id", validTestIds);

  if (!testQuestions || testQuestions.length === 0) {
    return [];
  }

  const linkedQuestionIds = Array.from(new Set(testQuestions.map((tq) => tq.question_id)));
  if (linkedQuestionIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("questions")
    .select(`
      *,
      exam:exams(id, slug, name),
      section:exam_sections(id, slug, name),
      subject:subjects(id, slug, name),
      chapter:chapters(id, slug, name),
      topic:topics(id, slug, name)
    `)
    .in("id", linkedQuestionIds)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (filters.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data: rawQuestions, error } = await query;

  if (error || !rawQuestions || rawQuestions.length === 0) {
    return [];
  }

  // 3. Deduplicate questions by normalized question_text
  const seenTexts = new Set<string>();
  const uniqueQuestions = rawQuestions.filter((q) => {
    const norm = (q.question_text || "").trim().toLowerCase();
    if (seenTexts.has(norm)) return false;
    seenTexts.add(norm);
    return true;
  });

  const questionIds = uniqueQuestions.map((q) => q.id);

  const { data: options } = await supabase
    .from("question_options")
    .select("*")
    .in("question_id", questionIds)
    .order("display_order", { ascending: true });

  const optionsMap = new Map<string, typeof options>();
  (options || []).forEach((opt) => {
    const list = optionsMap.get(opt.question_id) || [];
    list.push(opt);
    optionsMap.set(opt.question_id, list);
  });

  return uniqueQuestions.map((q) => ({
    ...q,
    options: optionsMap.get(q.id) || [],
  })) as QuestionWithDetails[];
}

/**
 * Fetch published tests with exam info and section breakdown
 */
export async function getPublishedTests(examSlug?: string): Promise<TestWithDetails[]> {
  const supabase = await createClient();

  let testQuery = supabase
    .from("tests")
    .select(`
      *,
      exam:exams!inner(id, slug, name, description, published)
    `)
    .eq("status", "published")
    .eq("exam.published", true)
    .order("created_at", { ascending: true });

  if (examSlug) {
    testQuery = testQuery.eq("exam.slug", examSlug);
  }

  const { data: rawTests, error } = await testQuery;

  if (error || !rawTests) {
    return [];
  }

  const tests = rawTests.filter((t) => !OLD_TEST_IDS.has(t.id));
  const testIds = tests.map((t) => t.id);
  if (testIds.length === 0) return [];

  const [{ data: testSections }, { data: testQuestions }] = await Promise.all([
    supabase
      .from("test_sections")
      .select(`
        *,
        section:exam_sections(*)
      `)
      .in("test_id", testIds)
      .order("display_order", { ascending: true }),
    supabase
      .from("test_questions")
      .select("test_id, marks")
      .in("test_id", testIds),
  ]);

  const sectionsByTest = new Map<string, (TestSection & { section: ExamSection })[]>();
  (testSections || []).forEach((ts) => {
    const list = sectionsByTest.get(ts.test_id) || [];
    list.push(ts as (TestSection & { section: ExamSection }));
    sectionsByTest.set(ts.test_id, list);
  });

  const questionCountByTest = new Map<string, { count: number; marks: number }>();
  (testQuestions || []).forEach((tq) => {
    const current = questionCountByTest.get(tq.test_id) || { count: 0, marks: 0 };
    current.count += 1;
    current.marks += Number(tq.marks || 0);
    questionCountByTest.set(tq.test_id, current);
  });

  const filteredTests = tests;

  return filteredTests.map((t) => {
    const stats = questionCountByTest.get(t.id) || { count: 0, marks: 0 };
    return {
      ...t,
      sections: sectionsByTest.get(t.id) || [],
      total_questions: stats.count,
      total_marks: stats.marks,
    };
  }) as TestWithDetails[];
}

/**
 * Fetch a single test by slug with its sections and configuration
 */
export async function getTestBySlug(slug: string): Promise<TestWithDetails | null> {
  const supabase = await createClient();

  const { data: test, error } = await supabase
    .from("tests")
    .select(`
      *,
      exam:exams!inner(id, slug, name, description, published)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("exam.published", true)
    .maybeSingle();

  if (error || !test) return null;

  const { data: testSections } = await supabase
    .from("test_sections")
    .select(`
      *,
      section:exam_sections(*)
    `)
    .eq("test_id", test.id)
    .order("display_order", { ascending: true });

  const { data: testQuestions } = await supabase
    .from("test_questions")
    .select("id, marks")
    .eq("test_id", test.id);

  const totalMarks = (testQuestions || []).reduce((acc, q) => acc + Number(q.marks || 0), 0);

  return {
    ...test,
    sections: testSections || [],
    total_questions: (testQuestions || []).length,
    total_marks: totalMarks,
  } as TestWithDetails;
}

/**
 * Fetch test questions WITHOUT correct answer keys (for mock preview / future test runner)
 */
export async function getTestQuestionsWithoutAnswerKey(testId: string): Promise<TestQuestion[]> {
  const supabase = await createClient();

  const { data: testQuestions, error } = await supabase
    .from("test_questions")
    .select(`
      id,
      test_id,
      question_id,
      section_id,
      display_order,
      marks,
      negative_marks,
      created_at,
      question:questions(
        id,
        exam_id,
        section_id,
        subject_id,
        chapter_id,
        topic_id,
        question_text,
        question_type,
        difficulty,
        explanation,
        marks,
        negative_marks,
        status,
        created_at,
        updated_at,
        options:question_options(
          id,
          question_id,
          option_label,
          option_text,
          display_order,
          created_at
        )
      )
    `)
    .eq("test_id", testId)
    .order("display_order", { ascending: true });

  if (error || !testQuestions) {
    return [];
  }

  return testQuestions as unknown as TestQuestion[];
}


export interface LearningProgress {
  completedTopicIds: string[];
  completedTopics: number;
  totalTopics: number;
  percentage: number;
}

/**
 * Fetch the signed-in student's topic-based My Learning progress.
 */
export async function getLearningProgress(userId: string): Promise<LearningProgress> {
  const supabase = await createClient();

  const [
    { data: topics, error: topicsError },
    { data: progress, error: progressError },
  ] = await Promise.all([
    supabase.from("topics").select("id"),
    supabase
      .from("user_learning_topic_progress")
      .select("topic_id")
      .eq("user_id", userId),
  ]);

  if (topicsError || progressError) {
    console.error("Failed to load topic learning progress:", {
      topicsError,
      progressError,
    });

    return {
      completedTopicIds: [],
      completedTopics: 0,
      totalTopics: topics?.length || 0,
      percentage: 0,
    };
  }

  const totalTopics = topics?.length || 0;
  const completedTopicIds = Array.from(
    new Set((progress || []).map((item) => item.topic_id)),
  );
  const completedTopics = completedTopicIds.length;
  const percentage =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return {
    completedTopicIds,
    completedTopics,
    totalTopics,
    percentage,
  };
}
