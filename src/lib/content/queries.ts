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
 * Fetch all published exams
 */
export async function getPublishedExams(): Promise<Exam[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("published", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching exams:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch a single published exam by slug along with its published sections
 */
export async function getExamBySlug(slug: string): Promise<(Exam & { sections: ExamSection[] }) | null> {
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
}

/**
 * Fetch exam sections by exam ID
 */
export async function getExamSections(examId: string): Promise<ExamSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sections")
    .select("*")
    .eq("exam_id", examId)
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching exam sections:", error);
    return [];
  }
  return data || [];
}

/**
 * Fetch full subject hierarchy: Subject -> Chapters -> Topics
 */
export async function getSubjectsWithHierarchy(): Promise<SubjectWithHierarchy[]> {
  const supabase = await createClient();
  const { data: subjects, error: subError } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });

  if (subError || !subjects) {
    return [];
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .order("display_order", { ascending: true });

  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .order("display_order", { ascending: true });

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
}

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

/**
 * Fetch published questions with their options (Security: Answer keys are NEVER queried or returned)
 */
export async function getPublishedQuestions(filters: QuestionFilters = {}): Promise<QuestionWithDetails[]> {
  const supabase = await createClient();

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

  const { data: questions, error } = await query;

  if (error || !questions || questions.length === 0) {
    return [];
  }

  const questionIds = questions.map((q) => q.id);

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

  return questions.map((q) => ({
    ...q,
    options: optionsMap.get(q.id) || [],
  })) as QuestionWithDetails[];
}

/**
 * Fetch published tests with exam info and section breakdown
 */
export async function getPublishedTests(examSlug?: string): Promise<TestWithDetails[]> {
  const supabase = await createClient();

  const testQuery = supabase
    .from("tests")
    .select(`
      *,
      exam:exams(id, slug, name)
    `)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  const { data: tests, error } = await testQuery;

  if (error || !tests) {
    return [];
  }

  const testIds = tests.map((t) => t.id);
  if (testIds.length === 0) return [];

  const { data: testSections } = await supabase
    .from("test_sections")
    .select(`
      *,
      section:exam_sections(*)
    `)
    .in("test_id", testIds)
    .order("display_order", { ascending: true });

  const { data: testQuestions } = await supabase
    .from("test_questions")
    .select("test_id, marks")
    .in("test_id", testIds);

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

  const filteredTests = examSlug
    ? tests.filter((t) => t.exam?.slug === examSlug)
    : tests;

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
      exam:exams(id, slug, name, description)
    `)
    .eq("slug", slug)
    .eq("status", "published")
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
