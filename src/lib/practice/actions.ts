"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PracticeQuestionOption {
  id: string;
  option_label: string;
  option_text: string;
  display_order: number;
}

export interface PracticeQuestion {
  id: string;
  question_text: string;
  difficulty: string;
  marks: number;
  explanation: string | null;
  options: PracticeQuestionOption[];
}

export type PracticeAnswerResult =
  | {
      success: true;
      correct: boolean;
      correctOption: {
        id: string;
        option_label: string;
        option_text: string;
      } | null;
    }
  | {
      success: false;
      error: string;
    };

export async function getTopicPracticeQuestions(topicId: string) {
  try {
    if (!topicId) {
      return { success: false, error: "Topic is required.", questions: [] as PracticeQuestion[] };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required.", questions: [] as PracticeQuestion[] };
    }

    const { data: linkedTestQuestions, error: testLinkError } = await supabase
      .from("test_questions")
      .select("question_id");

    if (testLinkError) {
      return { success: false, error: testLinkError.message, questions: [] as PracticeQuestion[] };
    }

    const mockTestQuestionIds = new Set(
      (linkedTestQuestions || []).map((item) => item.question_id)
    );

    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, question_text, difficulty, marks, explanation, question_options(id, option_label, option_text, display_order)"
      )
      .eq("topic_id", topicId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message, questions: [] as PracticeQuestion[] };
    }

    const questions: PracticeQuestion[] = (data || [])
      .filter((question: any) => !mockTestQuestionIds.has(question.id))
      .map((question: any) => ({
      id: question.id,
      question_text: question.question_text,
      difficulty: question.difficulty,
      marks: Number(question.marks ?? 1),
      explanation: question.explanation || null,
      options: [...(question.question_options || [])].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      ),
    }));

    return { success: true, questions };
  } catch (err) {
    console.error("getTopicPracticeQuestions error:", err);
    return {
      success: false,
      error: "Failed to load practice questions.",
      questions: [] as PracticeQuestion[],
    };
  }
}

/**
 * Checks the selected answer on the server so the protected answer key
 * is never exposed to the browser before the student answers.
 */
export async function checkTopicPracticeAnswer(
  questionId: string,
  selectedOptionId: string
): Promise<PracticeAnswerResult> {
  try {
    if (!questionId || !selectedOptionId) {
      return { success: false, error: "Question and selected option are required." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const adminClient = createAdminClient();

    const { data: question, error: questionError } = await adminClient
      .from("questions")
      .select("id, status, topic_id")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError || !question || question.status !== "published" || !question.topic_id) {
      return { success: false, error: "Practice question is not available." };
    }

    const { data: answerKey, error: answerKeyError } = await adminClient
      .from("question_answer_keys")
      .select("correct_option_id")
      .eq("question_id", questionId)
      .maybeSingle();

    if (answerKeyError || !answerKey) {
      return { success: false, error: "Answer key is not available." };
    }

    const { data: correctOption } = await adminClient
      .from("question_options")
      .select("id, option_label, option_text")
      .eq("id", answerKey.correct_option_id)
      .maybeSingle();

    return {
      success: true,
      correct: answerKey.correct_option_id === selectedOptionId,
      correctOption: correctOption || null,
    };
  } catch (err) {
    console.error("checkTopicPracticeAnswer error:", err);
    return { success: false, error: "Failed to check the answer." };
  }
}
