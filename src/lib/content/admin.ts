import { createClient } from "@/lib/supabase/server";
import type {
  Question,
  QuestionOption,
  QuestionAnswerKey,
  Test,
} from "@/types/content";

/**
 * Verify if current session user is an admin. Throws an error if not authorized.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: Sign in required");
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    throw new Error("Forbidden: Admin privileges required");
  }

  return { supabase, user };
}

export interface CreateQuestionInput {
  exam_id?: string | null;
  section_id?: string | null;
  subject_id?: string | null;
  chapter_id?: string | null;
  topic_id?: string | null;
  question_text: string;
  question_type?: "mcq";
  difficulty?: "easy" | "medium" | "hard";
  explanation?: string | null;
  marks?: number;
  negative_marks?: number;
  options: {
    option_label: string;
    option_text: string;
    display_order: number;
    is_correct?: boolean;
  }[];
}

/**
 * Admin: Create question with options and protected answer key
 */
export async function adminCreateQuestion(input: CreateQuestionInput): Promise<{ question: Question; options: QuestionOption[] }> {
  const { supabase } = await assertAdmin();

  // 1. Insert Question
  const { data: question, error: qError } = await supabase
    .from("questions")
    .insert({
      exam_id: input.exam_id,
      section_id: input.section_id,
      subject_id: input.subject_id,
      chapter_id: input.chapter_id,
      topic_id: input.topic_id,
      question_text: input.question_text,
      question_type: input.question_type || "mcq",
      difficulty: input.difficulty || "medium",
      explanation: input.explanation,
      marks: input.marks ?? 1.0,
      negative_marks: input.negative_marks ?? 0.0,
      status: "draft",
    })
    .select("*")
    .single();

  if (qError || !question) {
    throw new Error(`Failed to create question: ${qError?.message}`);
  }

  // 2. Insert Options
  const optionsToInsert = input.options.map((opt, idx) => ({
    question_id: question.id,
    option_label: opt.option_label,
    option_text: opt.option_text,
    display_order: opt.display_order ?? idx + 1,
  }));

  const { data: insertedOptions, error: optError } = await supabase
    .from("question_options")
    .insert(optionsToInsert)
    .select("*")
    .order("display_order", { ascending: true });

  if (optError || !insertedOptions) {
    throw new Error(`Failed to create options: ${optError?.message}`);
  }

  // 3. Insert Answer Key if specified
  const correctOptInput = input.options.find((opt) => opt.is_correct);
  if (correctOptInput) {
    const matchingInserted = insertedOptions.find((o) => o.option_label === correctOptInput.option_label);
    if (matchingInserted) {
      await supabase.from("question_answer_keys").insert({
        question_id: question.id,
        correct_option_id: matchingInserted.id,
      });
    }
  }

  return { question, options: insertedOptions };
}

/**
 * Admin: Set / update correct option in protected question_answer_keys table
 */
export async function adminSetAnswerKey(questionId: string, correctOptionId: string): Promise<QuestionAnswerKey> {
  const { supabase } = await assertAdmin();

  const { data, error } = await supabase
    .from("question_answer_keys")
    .upsert({
      question_id: questionId,
      correct_option_id: correctOptionId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to set answer key: ${error?.message}`);
  }

  return data;
}

/**
 * Admin: Read answer key for a question
 */
export async function adminGetAnswerKey(questionId: string): Promise<QuestionAnswerKey | null> {
  const { supabase } = await assertAdmin();

  const { data, error } = await supabase
    .from("question_answer_keys")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch answer key: ${error.message}`);
  }

  return data;
}

/**
 * Admin: Publish question
 */
export async function adminPublishQuestion(questionId: string): Promise<Question> {
  const { supabase } = await assertAdmin();

  const { data, error } = await supabase
    .from("questions")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", questionId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to publish question: ${error?.message}`);
  }

  return data;
}

export interface CreateTestInput {
  exam_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  test_type?: "practice" | "mock";
  duration_seconds: number;
  instructions?: string | null;
}

/**
 * Admin: Create a new test
 */
export async function adminCreateTest(input: CreateTestInput): Promise<Test> {
  const { supabase } = await assertAdmin();

  const { data, error } = await supabase
    .from("tests")
    .insert({
      exam_id: input.exam_id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      test_type: input.test_type || "mock",
      duration_seconds: input.duration_seconds,
      status: "draft",
      instructions: input.instructions,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test: ${error?.message}`);
  }

  return data;
}

/**
 * Admin: Publish a test
 */
export async function adminPublishTest(testId: string): Promise<Test> {
  const { supabase } = await assertAdmin();

  const { data, error } = await supabase
    .from("tests")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", testId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to publish test: ${error?.message}`);
  }

  return data;
}

