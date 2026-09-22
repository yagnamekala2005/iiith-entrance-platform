"use server";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Start or resume a test attempt for the authenticated student via the secure RPC.
 */
export async function startTestAttempt(testId: string): Promise<ActionResult<{ attemptId: string; isResumed: boolean }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be signed in to take a test." };
    }

    // Call the server-authoritative start_test_attempt RPC
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("start_test_attempt", {
      p_test_id: testId,
    });

    if (!rpcErr && rpcResult) {
      const res = rpcResult as { attempt_id: string; is_resumed: boolean };
      return {
        success: true,
        data: {
          attemptId: res.attempt_id,
          isResumed: res.is_resumed,
        },
      };
    }

    // Fallback: Validate and execute with direct queries if RPC is not yet registered
    const { data: test, error: testErr } = await supabase
      .from("tests")
      .select("id, status, name")
      .eq("id", testId)
      .maybeSingle();

    if (testErr || !test) {
      return { success: false, error: "Test not found." };
    }

    if (test.status !== "published") {
      return { success: false, error: "This test is not currently published." };
    }

    // Check for an existing in-progress attempt to resume
    const { data: existingAttempt } = await supabase
      .from("test_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("test_id", testId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (existingAttempt) {
      return {
        success: true,
        data: { attemptId: existingAttempt.id, isResumed: true },
      };
    }

    const { data: testQuestions, error: tqErr } = await supabase
      .from("test_questions")
      .select("question_id, section_id, display_order, marks, negative_marks")
      .eq("test_id", testId)
      .order("display_order", { ascending: true });

    if (tqErr || !testQuestions || testQuestions.length === 0) {
      return { success: false, error: "This test does not have any questions configured." };
    }

    const totalQuestions = testQuestions.length;
    const maxScore = testQuestions.reduce((acc, q) => acc + Number(q.marks || 0), 0);

    const { data: newAttempt, error: attemptCreateErr } = await supabase
      .from("test_attempts")
      .insert({
        user_id: user.id,
        test_id: testId,
        status: "in_progress",
        score: 0,
        max_score: maxScore,
        total_questions: totalQuestions,
        unanswered_count: totalQuestions,
        correct_count: 0,
        incorrect_count: 0,
      })
      .select("id")
      .single();

    if (attemptCreateErr || !newAttempt) {
      console.error("Error creating attempt:", attemptCreateErr);
      return { success: false, error: "Failed to initialize test attempt." };
    }

    const attemptQuestionsPayload = testQuestions.map((tq) => ({
      attempt_id: newAttempt.id,
      question_id: tq.question_id,
      section_id: tq.section_id,
      display_order: tq.display_order,
      marks: Number(tq.marks),
      negative_marks: Number(tq.negative_marks),
      status: "unanswered" as const,
      marked_for_review: false,
    }));

    const { error: batchInsertErr } = await supabase
      .from("attempt_questions")
      .insert(attemptQuestionsPayload);

    if (batchInsertErr) {
      console.error("Error creating attempt questions:", batchInsertErr);
      await supabase.from("test_attempts").delete().eq("id", newAttempt.id);
      return { success: false, error: "Failed to snapshot test questions." };
    }

    return {
      success: true,
      data: { attemptId: newAttempt.id, isResumed: false },
    };
  } catch (err) {
    console.error("startTestAttempt error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Save an answer for a question in an active attempt.
 */
export async function saveAttemptAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify attempt ownership & status
    const { data: attempt, error: attemptErr } = await supabase
      .from("test_attempts")
      .select("id, status, user_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    if (attempt.user_id !== user.id) {
      return { success: false, error: "Forbidden access." };
    }

    if (attempt.status !== "in_progress") {
      return { success: false, error: "Cannot modify answers of a submitted attempt." };
    }

    // 2. Verify question belongs to this attempt
    const { data: aq, error: aqErr } = await supabase
      .from("attempt_questions")
      .select("id")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (aqErr || !aq) {
      return { success: false, error: "Question does not belong to this attempt." };
    }

    // 3. Verify option belongs to the question
    const { data: option, error: optErr } = await supabase
      .from("question_options")
      .select("id")
      .eq("id", selectedOptionId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (optErr || !option) {
      return { success: false, error: "Invalid option selection for this question." };
    }

    // 4. Update attempt_questions (updating ONLY safe answer fields)
    const { error: updateErr } = await supabase
      .from("attempt_questions")
      .update({
        selected_option_id: selectedOptionId,
        status: "answered",
        answered_at: new Date().toISOString(),
      })
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId);

    if (updateErr) {
      console.error("Error saving answer:", updateErr);
      return { success: false, error: "Failed to save answer." };
    }

    return { success: true };
  } catch (err) {
    console.error("saveAttemptAnswer error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Clear the selected option for a question in an active attempt.
 */
export async function clearAttemptAnswer(
  attemptId: string,
  questionId: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify attempt ownership & status
    const { data: attempt, error: attemptErr } = await supabase
      .from("test_attempts")
      .select("id, status, user_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    if (attempt.user_id !== user.id) {
      return { success: false, error: "Forbidden access." };
    }

    if (attempt.status !== "in_progress") {
      return { success: false, error: "Cannot modify answers of a submitted attempt." };
    }

    // 2. Update attempt_questions to clear answer
    const { error: updateErr } = await supabase
      .from("attempt_questions")
      .update({
        selected_option_id: null,
        status: "unanswered",
        answered_at: null,
      })
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId);

    if (updateErr) {
      console.error("Error clearing answer:", updateErr);
      return { success: false, error: "Failed to clear answer." };
    }

    return { success: true };
  } catch (err) {
    console.error("clearAttemptAnswer error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Toggle mark for review state for a question in an active attempt.
 */
export async function toggleAttemptMarkForReview(
  attemptId: string,
  questionId: string,
  marked: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Verify attempt ownership & status
    const { data: attempt, error: attemptErr } = await supabase
      .from("test_attempts")
      .select("id, status, user_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return { success: false, error: "Attempt not found." };
    }

    if (attempt.user_id !== user.id) {
      return { success: false, error: "Forbidden access." };
    }

    if (attempt.status !== "in_progress") {
      return { success: false, error: "Cannot modify marked status of a submitted attempt." };
    }

    // 2. Update marked_for_review
    const { error: updateErr } = await supabase
      .from("attempt_questions")
      .update({
        marked_for_review: marked,
      })
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId);

    if (updateErr) {
      console.error("Error toggling mark for review:", updateErr);
      return { success: false, error: "Failed to update review flag." };
    }

    return { success: true };
  } catch (err) {
    console.error("toggleAttemptMarkForReview error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Submit attempt and calculate authoritative score server-side via the submit_and_score_attempt RPC.
 */
export async function submitTestAttempt(attemptId: string): Promise<ActionResult<{ score: number; maxScore: number }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Call Postgres security definer function submit_and_score_attempt
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("submit_and_score_attempt", {
      p_attempt_id: attemptId,
    });

    if (!rpcErr && rpcResult) {
      const res = rpcResult as {
        status: string;
        score: number;
        max_score: number;
        correct_count: number;
        incorrect_count: number;
        unanswered_count: number;
      };
      return {
        success: true,
        data: {
          score: Number(res.score),
          maxScore: Number(res.max_score),
        },
      };
    }

    // Fallback: direct server-side grading
    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (!attempt || attempt.user_id !== user.id) {
      return { success: false, error: "Attempt not found or unauthorized." };
    }

    if (attempt.status === "submitted") {
      return {
        success: true,
        data: { score: Number(attempt.score), maxScore: Number(attempt.max_score) },
      };
    }

    const { data: attemptQuestions } = await supabase
      .from("attempt_questions")
      .select("question_id, selected_option_id, marks, negative_marks")
      .eq("attempt_id", attemptId);

    const questionIds = (attemptQuestions || []).map((q) => q.question_id);
    const { data: answerKeys } = await supabase
      .from("question_answer_keys")
      .select("question_id, correct_option_id")
      .in("question_id", questionIds);

    const keyMap = new Map<string, string>();
    (answerKeys || []).forEach((k) => keyMap.set(k.question_id, k.correct_option_id));

    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    (attemptQuestions || []).forEach((aq) => {
      maxScore += Number(aq.marks || 1);
      const correctOptId = keyMap.get(aq.question_id);

      if (!aq.selected_option_id) {
        unansweredCount += 1;
      } else if (correctOptId && aq.selected_option_id === correctOptId) {
        correctCount += 1;
        score += Number(aq.marks || 1);
      } else {
        incorrectCount += 1;
        score -= Number(aq.negative_marks || 0);
      }
    });

    const { error: submitErr } = await supabase
      .from("test_attempts")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        score,
        max_score: maxScore,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        unanswered_count: unansweredCount,
      })
      .eq("id", attemptId);

    if (submitErr) {
      console.error("Error submitting attempt:", submitErr);
      return { success: false, error: "Failed to submit attempt." };
    }

    return {
      success: true,
      data: { score, maxScore },
    };
  } catch (err) {
    console.error("submitTestAttempt error:", err);
    return { success: false, error: "An unexpected error occurred during submission." };
  }
}
