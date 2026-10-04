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

interface PracticeQuestionRow {
  id: string;
  question_text: string;
  difficulty?: string | null;
  marks?: number | string | null;
  explanation?: string | null;
  practice_question_options?: Array<{
    id: string;
    option_label: string;
    option_text: string;
    display_order?: number | null;
  }> | null;
}

export async function getTopicPracticeQuestions(topicId: string) {
  try {
    if (!topicId) {
      return {
        success: false,
        error: "Topic is required.",
        questions: [] as PracticeQuestion[],
      };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required.",
        questions: [] as PracticeQuestion[],
      };
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("practice_questions")
      .select(
        "id, question_text, difficulty, marks, explanation, practice_question_options(id, option_label, option_text, display_order)"
      )
      .eq("topic_id", topicId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        questions: [] as PracticeQuestion[],
      };
    }

    const rows = (data as PracticeQuestionRow[] | null) ?? [];
    const questions: PracticeQuestion[] = rows.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      difficulty: question.difficulty || "medium",
      marks: Number(question.marks ?? 1),
      explanation: question.explanation || null,
      options: (question.practice_question_options || [])
        .map((option) => ({ ...option, display_order: option.display_order ?? 0 }))
        .sort((a, b) => a.display_order - b.display_order),
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
 * Checks the selected answer against the dedicated practice answer table.
 * The practice question data is completely separate from the mock-test
 * questions, options, and answer-key tables.
 */
export async function checkTopicPracticeAnswer(
  questionId: string,
  selectedOptionId: string
): Promise<PracticeAnswerResult> {
  try {
    if (!questionId || !selectedOptionId) {
      return {
        success: false,
        error: "Question and selected option are required.",
      };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const adminClient = createAdminClient();

    const { data: question, error: questionError } = await adminClient
      .from("practice_questions")
      .select("id, status")
      .eq("id", questionId)
      .maybeSingle();

    if (questionError || !question || question.status !== "published") {
      return { success: false, error: "Practice question is not available." };
    }

    const { data: answerKey, error: answerKeyError } = await adminClient
      .from("practice_question_answers")
      .select("correct_option_id")
      .eq("practice_question_id", questionId)
      .maybeSingle();

    if (answerKeyError || !answerKey) {
      return { success: false, error: "Answer key is not available." };
    }

    const { data: selectedOption } = await adminClient
      .from("practice_question_options")
      .select("id")
      .eq("id", selectedOptionId)
      .eq("practice_question_id", questionId)
      .maybeSingle();

    if (!selectedOption) {
      return { success: false, error: "Selected option is not valid for this question." };
    }

    const { data: correctOption } = await adminClient
      .from("practice_question_options")
      .select("id, option_label, option_text")
      .eq("id", answerKey.correct_option_id)
      .eq("practice_question_id", questionId)
      .maybeSingle();

    if (!correctOption) {
      return { success: false, error: "Correct answer option is not available." };
    }

    return {
      success: true,
      correct: answerKey.correct_option_id === selectedOptionId,
      correctOption,
    };
  } catch (err) {
    console.error("checkTopicPracticeAnswer error:", err);
    return { success: false, error: "Failed to check the answer." };
  }
}
