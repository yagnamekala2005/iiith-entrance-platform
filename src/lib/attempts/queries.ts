import { createClient } from "@/lib/supabase/server";
import type {
  AttemptForTaking,
  AttemptQuestionTaking,
  AttemptResult,
  AttemptReview,
  AttemptSectionResult,
  TestAttempt,
  TestWithDetails,
} from "@/types/content";

/**
 * Fetch an in-progress attempt for active taking.
 * CRITICAL SECURITY: Never queries or returns answer keys or explanations.
 */
export async function getAttemptForTaking(attemptId: string): Promise<AttemptForTaking | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 1. Fetch attempt
  const { data: attempt, error: attemptErr } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptErr || !attempt) {
    return null;
  }

  // Check ownership (or admin)
  if (attempt.user_id !== user.id) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return null;
  }

  // 2. Fetch test details
  const { data: test, error: testErr } = await supabase
    .from("tests")
    .select(`
      *,
      exam:exams(id, slug, name, description)
    `)
    .eq("id", attempt.test_id)
    .maybeSingle();

  if (testErr || !test) {
    return null;
  }

  const { data: testSections } = await supabase
    .from("test_sections")
    .select(`
      *,
      section:exam_sections(*)
    `)
    .eq("test_id", test.id)
    .order("display_order", { ascending: true });

  const fullTest: TestWithDetails = {
    ...test,
    sections: testSections || [],
    total_questions: attempt.total_questions,
    total_marks: attempt.max_score,
  };

  // 3. Fetch attempt questions (safe payload: no answer keys, no explanations)
  const { data: attemptQuestions, error: aqErr } = await supabase
    .from("attempt_questions")
    .select(`
      id,
      attempt_id,
      question_id,
      section_id,
      display_order,
      selected_option_id,
      status,
      marked_for_review,
      marks,
      negative_marks,
      section:exam_sections(name),
      question:questions(
        id,
        question_text,
        difficulty
      )
    `)
    .eq("attempt_id", attemptId)
    .order("display_order", { ascending: true });

  if (aqErr || !attemptQuestions || attemptQuestions.length === 0) {
    return null;
  }

  // 4. Fetch options for these questions
  const questionIds = attemptQuestions.map((aq) => aq.question_id);
  const { data: options } = await supabase
    .from("question_options")
    .select("*")
    .in("question_id", questionIds)
    .order("display_order", { ascending: true });

  const optionsByQuestion = new Map<string, typeof options>();
  (options || []).forEach((opt) => {
    const list = optionsByQuestion.get(opt.question_id) || [];
    list.push(opt);
    optionsByQuestion.set(opt.question_id, list);
  });

  const formattedQuestions: AttemptQuestionTaking[] = attemptQuestions.map((aq) => {
    const qObj = aq.question as unknown as { id: string; question_text: string; difficulty: "easy" | "medium" | "hard" };
    const secObj = aq.section as unknown as { name: string } | null;
    return {
      id: aq.id,
      attempt_id: aq.attempt_id,
      question_id: aq.question_id,
      section_id: aq.section_id,
      section_name: secObj?.name || "General",
      display_order: aq.display_order,
      selected_option_id: aq.selected_option_id,
      status: aq.status,
      marked_for_review: aq.marked_for_review,
      marks: Number(aq.marks),
      negative_marks: Number(aq.negative_marks),
      question_text: qObj?.question_text || "",
      difficulty: qObj?.difficulty || "medium",
      options: optionsByQuestion.get(aq.question_id) || [],
    };
  });

  return {
    attempt: {
      ...attempt,
      score: Number(attempt.score),
      max_score: Number(attempt.max_score),
    },
    test: fullTest,
    questions: formattedQuestions,
  };
}

/**
 * Fetch high-level result and scorecard for a submitted attempt.
 */
export async function getAttemptResult(attemptId: string): Promise<AttemptResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: attempt, error: attemptErr } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptErr || !attempt) return null;

  if (attempt.user_id !== user.id) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return null;
  }

  const { data: test } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attempt.test_id)
    .single();

  if (!test) return null;

  // Fetch section breakdown
  const { data: attemptQuestions } = await supabase
    .from("attempt_questions")
    .select(`
      section_id,
      marks,
      negative_marks,
      selected_option_id,
      section:exam_sections(name),
      question:questions(
        id,
        answer_key:question_answer_keys(correct_option_id)
      )
    `)
    .eq("attempt_id", attemptId);

  const sectionMap = new Map<string, AttemptSectionResult>();

  (attemptQuestions || []).forEach((aq) => {
    const secId = aq.section_id || "general";
    const secName = (aq.section as unknown as { name: string } | null)?.name || "General Section";
    const q = aq.question as unknown as { id: string; answer_key: { correct_option_id: string }[] | null } | null;
    const correctOptId = q?.answer_key?.[0]?.correct_option_id;

    const current = sectionMap.get(secId) || {
      section_id: secId,
      section_name: secName,
      total_questions: 0,
      correct_count: 0,
      incorrect_count: 0,
      unanswered_count: 0,
      score: 0,
      max_score: 0,
    };

    current.total_questions += 1;
    current.max_score += Number(aq.marks || 1);

    if (!aq.selected_option_id) {
      current.unanswered_count += 1;
    } else if (correctOptId && aq.selected_option_id === correctOptId) {
      current.correct_count += 1;
      current.score += Number(aq.marks || 1);
    } else {
      current.incorrect_count += 1;
      current.score -= Number(aq.negative_marks || 0);
    }

    sectionMap.set(secId, current);
  });

  const attemptedCount = attempt.correct_count + attempt.incorrect_count;
  const accuracy = attemptedCount > 0
    ? (attempt.correct_count / attemptedCount) * 100
    : 0;

  return {
    attempt: {
      ...attempt,
      score: Number(attempt.score),
      max_score: Number(attempt.max_score),
    },
    test,
    accuracy_percentage: Number(accuracy.toFixed(1)),
    section_results: Array.from(sectionMap.values()),
  };
}

/**
 * Fetch detailed answer review (Strictly accessible ONLY after submission).
 */
export async function getAttemptReview(attemptId: string): Promise<AttemptReview | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Try RPC first (which has strict server-side submission check)
  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_attempt_review_data", {
    p_attempt_id: attemptId,
  });

  if (!rpcErr && rpcData) {
    const data = rpcData as {
      attempt: TestAttempt;
      test: AttemptReview["test"];
      questions: AttemptReview["questions"];
      section_results: AttemptReview["section_results"];
    };
    return {
      attempt: {
        ...data.attempt,
        score: Number(data.attempt.score),
        max_score: Number(data.attempt.max_score),
      },
      test: data.test,
      questions: data.questions,
      section_results: data.section_results,
    };
  }

  // Fallback direct server-side query with submitted guard
  const { data: attempt } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.status !== "submitted") {
    return null;
  }

  if (attempt.user_id !== user.id) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) return null;
  }

  const { data: test } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attempt.test_id)
    .single();

  if (!test) return null;

  const { data: attemptQuestions } = await supabase
    .from("attempt_questions")
    .select(`
      id,
      question_id,
      section_id,
      display_order,
      selected_option_id,
      marks,
      negative_marks,
      section:exam_sections(name),
      question:questions(
        id,
        question_text,
        difficulty,
        explanation,
        options:question_options(*),
        answer_key:question_answer_keys(correct_option_id)
      )
    `)
    .eq("attempt_id", attemptId)
    .order("display_order", { ascending: true });

  const formattedQuestions = (attemptQuestions || []).map((aq) => {
    const q = aq.question as unknown as {
      id: string;
      question_text: string;
      difficulty: "easy" | "medium" | "hard";
      explanation: string | null;
      options: { id: string; question_id: string; option_label: string; option_text: string; display_order: number; created_at: string }[];
      answer_key: { correct_option_id: string }[] | null;
    };
    const sec = aq.section as unknown as { name: string } | null;
    const correctOptId = q?.answer_key?.[0]?.correct_option_id || "";
    const isCorrect = Boolean(aq.selected_option_id && aq.selected_option_id === correctOptId);
    const isUnanswered = aq.selected_option_id === null;

    let scoreAwarded = 0;
    if (isCorrect) {
      scoreAwarded = Number(aq.marks);
    } else if (!isUnanswered) {
      scoreAwarded = -Number(aq.negative_marks);
    }

    return {
      id: aq.id,
      question_id: aq.question_id,
      section_id: aq.section_id,
      section_name: sec?.name || "General",
      display_order: aq.display_order,
      question_text: q?.question_text || "",
      difficulty: q?.difficulty || "medium",
      marks: Number(aq.marks),
      negative_marks: Number(aq.negative_marks),
      options: (q?.options || []).sort((a, b) => a.display_order - b.display_order),
      selected_option_id: aq.selected_option_id,
      correct_option_id: correctOptId,
      is_correct: isCorrect,
      is_unanswered: isUnanswered,
      score_awarded: scoreAwarded,
      explanation: q?.explanation || null,
    };
  });

  return {
    attempt: {
      ...attempt,
      score: Number(attempt.score),
      max_score: Number(attempt.max_score),
    },
    test,
    questions: formattedQuestions,
    section_results: [],
  };
}

/**
 * Fetch all attempts for the current student
 */
export async function getUserAttempts(): Promise<TestAttempt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: attempts, error } = await supabase
    .from("test_attempts")
    .select(`
      *,
      test:tests(
        id,
        slug,
        name,
        description,
        test_type,
        duration_seconds,
        status,
        instructions,
        published_at,
        created_at,
        updated_at,
        exam:exams(id, slug, name, description)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !attempts) {
    return [];
  }

  return attempts.map((att) => ({
    ...att,
    score: Number(att.score),
    max_score: Number(att.max_score),
    test: att.test as unknown as TestWithDetails,
  })) as TestAttempt[];
}

/**
 * Get active in-progress attempt for a test if any
 */
export async function getActiveAttemptForTest(testId: string): Promise<TestAttempt | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("user_id", user.id)
    .eq("test_id", testId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error || !attempt) return null;

  return {
    ...attempt,
    score: Number(attempt.score),
    max_score: Number(attempt.max_score),
  } as TestAttempt;
}

