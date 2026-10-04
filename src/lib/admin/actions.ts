"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface CreateQuestionInput {
  subject_id: string;
  chapter_id?: string | null;
  topic_id?: string | null;
  exam_id?: string | null;
  section_id?: string | null;
  question_text: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  marks: number;
  negative_marks: number;
  options: {
    label: string;
    text: string;
  }[];
  correct_option_label: string; // 'A' | 'B' | 'C' | 'D'
  add_to_test_ids?: string[]; // tests to link this question to
}

export async function createAdminQuestion(input: CreateQuestionInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    // Check admin status
    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    if (!input.question_text.trim()) {
      return { success: false, error: "Question text is required." };
    }

    if (!input.options || input.options.length < 2) {
      return { success: false, error: "At least 2 options are required." };
    }

    const adminClient = createAdminClient();

    // 1. Insert question into `questions`
    const { data: newQ, error: qErr } = await adminClient
      .from("questions")
      .insert({
        subject_id: input.subject_id,
        chapter_id: input.chapter_id || null,
        topic_id: input.topic_id || null,
        exam_id: input.exam_id || null,
        section_id: input.section_id || null,
        question_text: input.question_text.trim(),
        question_type: "mcq",
        difficulty: input.difficulty,
        explanation: input.explanation ? input.explanation.trim() : null,
        marks: input.marks || 1,
        negative_marks: input.negative_marks || 0.25,
        status: "published",
      })
      .select("id")
      .single();

    if (qErr || !newQ) {
      console.error("Error creating question:", qErr);
      return { success: false, error: qErr?.message || "Failed to create question." };
    }

    // 2. Insert options into `question_options`
    const optionsPayload = input.options.map((opt, idx) => ({
      question_id: newQ.id,
      option_label: opt.label.toUpperCase(),
      option_text: opt.text.trim(),
      display_order: idx + 1,
    }));

    const { data: insertedOptions, error: optErr } = await adminClient
      .from("question_options")
      .insert(optionsPayload)
      .select("id, option_label");

    if (optErr || !insertedOptions) {
      console.error("Error creating options:", optErr);
      await adminClient.from("questions").delete().eq("id", newQ.id);
      return { success: false, error: "Failed to create question options." };
    }

    // 3. Find correct option id and save to `question_answer_keys`
    const correctOpt = insertedOptions.find(
      (o) => o.option_label === input.correct_option_label.toUpperCase()
    );

    if (correctOpt) {
      const { error: keyErr } = await adminClient
        .from("question_answer_keys")
        .insert({
          question_id: newQ.id,
          correct_option_id: correctOpt.id,
        });

      if (keyErr) {
        console.error("Error saving answer key:", keyErr);
      }
    }

    // 4. Optionally link question to specified active tests
    if (input.add_to_test_ids && input.add_to_test_ids.length > 0) {
      for (const testId of input.add_to_test_ids) {
        // Check test current status
        const { data: currentTest } = await adminClient
          .from("tests")
          .select("id, status")
          .eq("id", testId)
          .maybeSingle();

        const wasPublished = currentTest?.status === "published";

        // If published, temporarily switch to draft to allow linking questions
        if (wasPublished) {
          await adminClient.from("tests").update({ status: "draft" }).eq("id", testId);
        }

        // Find highest display order in test
        const { count } = await adminClient
          .from("test_questions")
          .select("*", { count: "exact", head: true })
          .eq("test_id", testId);

        const newOrder = (count || 0) + 1;

        // Ensure valid section_id from test_sections
        let targetSectionId = input.section_id || null;
        if (!targetSectionId) {
          const { data: testSections } = await adminClient
            .from("test_sections")
            .select("section_id")
            .eq("test_id", testId)
            .limit(1);
          targetSectionId = testSections?.[0]?.section_id || null;
        }

        const { error: linkErr } = await adminClient.from("test_questions").insert({
          test_id: testId,
          question_id: newQ.id,
          section_id: targetSectionId,
          display_order: newOrder,
          marks: input.marks || 1,
          negative_marks: input.negative_marks || 0.25,
        });

        if (linkErr) {
          console.error("Error linking question to test:", linkErr);
        }

        // Restore published status if it was published
        if (wasPublished) {
          await adminClient.from("tests").update({ status: "published" }).eq("id", testId);
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/practice");
    revalidatePath("/tests");

    return { success: true, questionId: newQ.id };
  } catch (err) {
    console.error("createAdminQuestion catch error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export interface CreatePracticeQuestionInput {
  subject_id: string;
  chapter_id: string;
  topic_id: string;
  question_text: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  marks: number;
  options: {
    label: string;
    text: string;
  }[];
  correct_option_label: string;
}

/**
 * Create a published topic practice question.
 * Practice questions are intentionally not linked to tests/test_questions.
 */
export async function createAdminPracticeQuestion(input: CreatePracticeQuestionInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const { data: adminMembership } = await createAdminClient()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    if (!input.subject_id || !input.chapter_id || !input.topic_id) {
      return { success: false, error: "Subject, chapter, and topic are required." };
    }

    if (!input.question_text.trim()) {
      return { success: false, error: "Question text is required." };
    }

    if (!input.explanation.trim()) {
      return { success: false, error: "A solution explanation is required." };
    }

    if (
      !input.options ||
      input.options.length !== 4 ||
      input.options.some((option) => !option.text.trim())
    ) {
      return { success: false, error: "All 4 options (A, B, C, D) are required." };
    }

    const adminClient = createAdminClient();

    const { data: newQuestion, error: questionError } = await adminClient
      .from("practice_questions")
      .insert({
        subject_id: input.subject_id,
        chapter_id: input.chapter_id,
        topic_id: input.topic_id,
        question_text: input.question_text.trim(),
        difficulty: input.difficulty,
        explanation: input.explanation.trim(),
        marks: Number.isFinite(input.marks) ? input.marks : 1,
        status: "published",
      })
      .select("id")
      .single();

    if (questionError || !newQuestion) {
      return {
        success: false,
        error: questionError?.message || "Failed to create practice question.",
      };
    }

    const optionsPayload = input.options.map((option, index) => ({
      practice_question_id: newQuestion.id,
      option_label: option.label.toUpperCase(),
      option_text: option.text.trim(),
      display_order: index + 1,
    }));

    const { data: insertedOptions, error: optionsError } = await adminClient
      .from("practice_question_options")
      .insert(optionsPayload)
      .select("id, option_label");

    if (optionsError || !insertedOptions) {
      await adminClient.from("practice_questions").delete().eq("id", newQuestion.id);
      return {
        success: false,
        error: optionsError?.message || "Failed to create practice question options.",
      };
    }

    const correctOption = insertedOptions.find(
      (option) => option.option_label === input.correct_option_label.toUpperCase()
    );

    if (!correctOption) {
      await adminClient
        .from("practice_question_options")
        .delete()
        .eq("practice_question_id", newQuestion.id);
      await adminClient.from("practice_questions").delete().eq("id", newQuestion.id);
      return { success: false, error: "Please select a valid correct option." };
    }

    const { error: answerKeyError } = await adminClient
      .from("practice_question_answers")
      .insert({
        practice_question_id: newQuestion.id,
        correct_option_id: correctOption.id,
      });

    if (answerKeyError) {
      await adminClient
        .from("practice_question_options")
        .delete()
        .eq("practice_question_id", newQuestion.id);
      await adminClient.from("practice_questions").delete().eq("id", newQuestion.id);
      return {
        success: false,
        error: answerKeyError.message || "Failed to save the correct answer.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/learning");
    revalidatePath("/practice");

    return { success: true, questionId: newQuestion.id };
  } catch (err) {
    console.error("createAdminPracticeQuestion error:", err);
    return { success: false, error: "Failed to create practice question." };
  }
}

export interface AdminPracticeQuestionItem {
  id: string;
  topic_id: string;
  question_text: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  explanation: string | null;
  options: {
    id: string;
    option_label: string;
    option_text: string;
    display_order: number;
  }[];
  correct_option_label: string;
}

export async function getAdminTopicPracticeQuestions(topicId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Authentication required.",
        questions: [] as AdminPracticeQuestionItem[],
      };
    }

    const { data: adminMembership } = await createAdminClient()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return {
        success: false,
        error: "Admin authorization required.",
        questions: [] as AdminPracticeQuestionItem[],
      };
    }

    if (!topicId) {
      return {
        success: false,
        error: "Topic is required.",
        questions: [] as AdminPracticeQuestionItem[],
      };
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("practice_questions")
      .select(
        "id, topic_id, question_text, difficulty, marks, explanation, created_at, practice_question_options(id, option_label, option_text, display_order), practice_question_answers(correct_option_id)"
      )
      .eq("topic_id", topicId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        questions: [] as AdminPracticeQuestionItem[],
      };
    }

    type PracticeQuestionDataRow = {
      id: string;
      topic_id: string;
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
      practice_question_answers?: Array<{ correct_option_id: string }> | null;
    };

    const questions: AdminPracticeQuestionItem[] = ((data as PracticeQuestionDataRow[] | null) || []).map((question) => {
      const options = (question.practice_question_options || [])
        .map((option) => ({ ...option, display_order: option.display_order ?? 0 }))
        .sort((a, b) => a.display_order - b.display_order);
      const correctId = question.practice_question_answers?.[0]?.correct_option_id;
      const correctOption = options.find((option) => option.id === correctId);

      return {
        id: question.id,
        topic_id: question.topic_id,
        question_text: question.question_text,
        difficulty: (question.difficulty as AdminPracticeQuestionItem["difficulty"]) || "medium",
        marks: Number(question.marks ?? 1),
        explanation: question.explanation || null,
        options,
        correct_option_label: correctOption?.option_label || "A",
      };
    });

    return { success: true, questions };
  } catch (err) {
    console.error("getAdminTopicPracticeQuestions error:", err);
    return {
      success: false,
      error: "Failed to load practice questions.",
      questions: [] as AdminPracticeQuestionItem[],
    };
  }
}

export async function updateAdminPracticeQuestion(
  questionId: string,
  input: Omit<CreatePracticeQuestionInput, "subject_id" | "chapter_id" | "topic_id">
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required." };

    const { data: adminMembership } = await createAdminClient()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    if (!questionId || !input.question_text.trim()) {
      return { success: false, error: "Question text is required." };
    }

    if (!input.explanation.trim()) {
      return { success: false, error: "A solution explanation is required." };
    }

    if (
      input.options.length !== 4 ||
      input.options.some((option) => !option.text.trim())
    ) {
      return { success: false, error: "All 4 options (A, B, C, D) are required." };
    }

    const adminClient = createAdminClient();

    const { data: existingQuestion, error: existingQuestionError } = await adminClient
      .from("practice_questions")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();

    if (existingQuestionError || !existingQuestion) {
      return {
        success: false,
        error: existingQuestionError?.message || "Practice question not found.",
      };
    }

    const { error: questionError } = await adminClient
      .from("practice_questions")
      .update({
        question_text: input.question_text.trim(),
        difficulty: input.difficulty,
        explanation: input.explanation.trim(),
        marks: Number.isFinite(input.marks) ? input.marks : 1,
      })
      .eq("id", questionId);

    if (questionError) {
      return { success: false, error: questionError.message };
    }

    await adminClient
      .from("practice_question_answers")
      .delete()
      .eq("practice_question_id", questionId);

    await adminClient
      .from("practice_question_options")
      .delete()
      .eq("practice_question_id", questionId);

    const { data: insertedOptions, error: optionsError } = await adminClient
      .from("practice_question_options")
      .insert(
        input.options.map((option, index) => ({
          practice_question_id: questionId,
          option_label: option.label.toUpperCase(),
          option_text: option.text.trim(),
          display_order: index + 1,
        }))
      )
      .select("id, option_label");

    if (optionsError || !insertedOptions) {
      return {
        success: false,
        error: optionsError?.message || "Failed to update options.",
      };
    }

    const correctOption = insertedOptions.find(
      (option) => option.option_label === input.correct_option_label.toUpperCase()
    );

    if (!correctOption) {
      return { success: false, error: "Please select a valid correct option." };
    }

    const { error: answerError } = await adminClient
      .from("practice_question_answers")
      .insert({
        practice_question_id: questionId,
        correct_option_id: correctOption.id,
      });

    if (answerError) {
      return { success: false, error: answerError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/learning");
    revalidatePath("/practice");

    return { success: true };
  } catch (err) {
    console.error("updateAdminPracticeQuestion error:", err);
    return { success: false, error: "Failed to update practice question." };
  }
}
export async function deleteAdminQuestion(questionId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();

    // 1. Find tests linked to this question
    const { data: linkedTests } = await adminClient
      .from("test_questions")
      .select("test_id")
      .eq("question_id", questionId);

    const testIds = Array.from(new Set((linkedTests || []).map((t) => t.test_id)));

    // For any published tests, temporarily set status to draft to allow question removal
    const publishedTestIds: string[] = [];
    if (testIds.length > 0) {
      const { data: pubTests } = await adminClient
        .from("tests")
        .select("id")
        .in("id", testIds)
        .eq("status", "published");

      if (pubTests && pubTests.length > 0) {
        for (const pt of pubTests) {
          publishedTestIds.push(pt.id);
        }
        await adminClient.from("tests").update({ status: "draft" }).in("id", publishedTestIds);
      }
    }

    // 2. Delete test_questions link
    await adminClient.from("test_questions").delete().eq("question_id", questionId);

    // 3. Restore published status on tests
    if (publishedTestIds.length > 0) {
      await adminClient.from("tests").update({ status: "published" }).in("id", publishedTestIds);
    }

    // 4. Delete attempt_questions if any student attempted it
    try {
      await adminClient.from("attempt_questions").delete().eq("question_id", questionId);
    } catch (e) {
      console.warn("attempt_questions delete notice:", e);
    }

    // 5. Delete answer key
    await adminClient.from("question_answer_keys").delete().eq("question_id", questionId);
    // 6. Delete options
    await adminClient.from("question_options").delete().eq("question_id", questionId);
    // 7. Delete question from questions table in Supabase
    const { error: delErr } = await adminClient.from("questions").delete().eq("id", questionId);

    if (delErr) {
      console.warn("Hard delete prevented, archiving question instead:", delErr.message);
      const { error: archErr } = await adminClient
        .from("questions")
        .update({ status: "archived" })
        .eq("id", questionId);

      if (archErr) {
        return { success: false, error: delErr.message };
      }
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    return { success: true };
  } catch (err) {
    console.error("deleteAdminQuestion error:", err);
    return { success: false, error: "Failed to delete question." };
  }
}

export async function addAdminUserByEmail(email: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const adminClient = createAdminClient();
    const { data: users, error: listErr } = await adminClient.auth.admin.listUsers();

    if (listErr || !users) {
      return { success: false, error: "Failed to list users." };
    }

    const targetUser = users.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());

    if (!targetUser) {
      return { success: false, error: `No registered user found with email "${email}".` };
    }

    const { error: insertErr } = await adminClient
      .from("admin_users")
      .upsert({ user_id: targetUser.id });

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    revalidatePath("/admin");
    return { success: true, email: targetUser.email };
  } catch (err) {
    console.error("addAdminUserByEmail error:", err);
    return { success: false, error: "Failed to enroll admin." };
  }
}

export interface CreateMockTestInput {
  name: string;
  exam_id: string;
  duration_minutes: number;
  description?: string;
  test_type?: "mock" | "practice";
}

export async function createAdminMockTest(input: CreateMockTestInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    if (!input.name.trim()) {
      return { success: false, error: "Mock test name is required." };
    }

    const adminClient = createAdminClient();

    // Generate unique slug
    const cleanSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const uniqueSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;

    const durationSeconds = Math.max(60, (input.duration_minutes || 180) * 60);

    // Insert into tests
    const { data: newTest, error: testErr } = await adminClient
      .from("tests")
      .insert({
        name: input.name.trim(),
        slug: uniqueSlug,
        exam_id: input.exam_id,
        test_type: input.test_type || "mock",
        duration_seconds: durationSeconds,
        description: input.description?.trim() || `Official CBT mock examination for IIITH entrance.`,
        status: "draft",
      })
      .select("id, name, slug, duration_seconds, test_type, exam_id, status")
      .single();

    if (testErr || !newTest) {
      console.error("Error creating test:", testErr);
      return { success: false, error: testErr?.message || "Failed to create mock test." };
    }

    // Auto-create test_sections based on exam_sections if available
    const { data: examSections } = await adminClient
      .from("exam_sections")
      .select("id, name, default_duration_seconds, display_order")
      .eq("exam_id", input.exam_id)
      .order("display_order", { ascending: true });

    if (examSections && examSections.length > 0) {
      const sectionsPayload = examSections.map((es) => ({
        test_id: newTest.id,
        section_id: es.id,
        duration_seconds: es.default_duration_seconds,
        display_order: es.display_order,
      }));

      await adminClient.from("test_sections").insert(sectionsPayload);
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");

    return { success: true, test: newTest };
  } catch (err) {
    console.error("createAdminMockTest error:", err);
    return { success: false, error: "Failed to create mock test." };
  }
}

export async function deleteAdminMockTest(testId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();

    // 1. Mark test as archived immediately so it disappears from student & admin views
    await adminClient.from("tests").update({ status: "archived" }).eq("id", testId);

    // 2. Delete test_questions and test_sections
    await adminClient.from("test_questions").delete().eq("test_id", testId);
    await adminClient.from("test_sections").delete().eq("test_id", testId);

    // 3. Delete associated attempts and attempt questions with admin client
    try {
      const { data: testAttempts } = await adminClient
        .from("test_attempts")
        .select("id")
        .eq("test_id", testId);

      if (testAttempts && testAttempts.length > 0) {
        const attemptIds = testAttempts.map((a) => a.id);
        await adminClient.from("attempt_questions").delete().in("attempt_id", attemptIds);
        await adminClient.from("test_attempts").delete().in("id", attemptIds);
      }
    } catch (e) {
      console.warn("Attempt cleanup notice:", e);
    }

    // 4. Finally delete the test row from tests table in Supabase
    const { error: delErr } = await adminClient.from("tests").delete().eq("id", testId);

    if (delErr) {
      console.warn("Test row retained as archived due to foreign constraint:", delErr.message);
    }

    // 5. Purge any orphan questions from this deleted test
    await purgeDuplicateAndOrphanQuestions();

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err) {
    console.error("deleteAdminMockTest error:", err);
    return { success: false, error: "Failed to delete mock test." };
  }
}

export async function cleanAllOldMockTests() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();

    // 1. Mark all tests as archived immediately
    await adminClient.from("tests").update({ status: "archived" }).neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Delete all test_questions and test_sections
    await adminClient.from("test_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("test_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Attempt to clean attempts
    try {
      const { data: allAttempts } = await adminClient.from("test_attempts").select("id");
      if (allAttempts && allAttempts.length > 0) {
        const attemptIds = allAttempts.map((a) => a.id);
        await adminClient.from("attempt_questions").delete().in("attempt_id", attemptIds);
        await adminClient.from("test_attempts").delete().in("id", attemptIds);
      }
    } catch (e) {
      console.warn("Attempts clean notice:", e);
    }

    // 4. Delete all tests
    await adminClient.from("tests").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 5. Purge all questions no longer attached to active tests
    await purgeDuplicateAndOrphanQuestions();

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/learning");
    revalidatePath("/practice");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err) {
    console.error("cleanAllOldMockTests error:", err);
    return { success: false, error: "Failed to clean old mock tests." };
  }
}

export async function publishAdminMockTest(testId: string) {
  try {
    const adminClient = createAdminClient();

    const { data: updatedTest, error: updateErr } = await adminClient
      .from("tests")
      .update({ status: "published" })
      .eq("id", testId)
      .select("id, name, status")
      .single();

    if (updateErr) {
      console.error("Error publishing test:", updateErr);
      return { success: false, error: updateErr.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/", "layout");

    return { success: true, test: updatedTest };
  } catch (err) {
    console.error("publishAdminMockTest error:", err);
    return { success: false, error: "Failed to publish mock test." };
  }
}

export async function createAdminExam(name: string, description: string = "", negativeMarkingRatio: number | null = null) {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Exam name is required." };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required." };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();
    const cleanSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return { success: false, error: "Exam name must contain letters or numbers." };
    }

    const { data: existingExam } = await adminClient
      .from("exams")
      .select("id")
      .or(`name.ilike.${cleanName},slug.eq.${cleanSlug}`)
      .maybeSingle();

    if (existingExam) {
      return { success: false, error: "An exam with this name already exists." };
    }

    const { data, error } = await adminClient
      .from("exams")
      .insert({
        name: cleanName,
        slug: cleanSlug,
        description: description.trim() || null,
        negative_marking_ratio:
          negativeMarkingRatio !== null && Number.isFinite(negativeMarkingRatio)
            ? negativeMarkingRatio
            : null,
        published: false,
      })
      .select("id, name, slug, description, negative_marking_ratio, published")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/practice");

    return { success: true, exam: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create exam.";
    return { success: false, error: msg };
  }
}

export async function createAdminSubject(name: string, description: string = "") {
  try {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: "Subject name is required." };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required." };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();
    const cleanSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return { success: false, error: "Subject name must contain letters or numbers." };
    }

    const { data: existingSubject } = await adminClient
      .from("subjects")
      .select("id")
      .or(`name.ilike.${cleanName},slug.eq.${cleanSlug}`)
      .maybeSingle();

    if (existingSubject) {
      return { success: false, error: "A subject with this name already exists." };
    }

    const { count } = await adminClient
      .from("subjects")
      .select("*", { count: "exact", head: true });

    const { data, error } = await adminClient
      .from("subjects")
      .insert({
        name: cleanName,
        slug: cleanSlug,
        description: description.trim() || null,
        display_order: (count || 0) + 1,
      })
      .select("id, name, slug")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/learning");
    revalidatePath("/practice");
    revalidatePath("/tests");
    revalidatePath("/", "layout");

    return { success: true, subject: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create subject.";
    return { success: false, error: msg };
  }
}

export async function createAdminChapter(subject_id: string, name: string) {
  try {
    if (!name.trim()) return { success: false, error: "Chapter name is required." };
    const adminClient = createAdminClient();
    const cleanSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    const { count } = await adminClient.from("chapters").select("*", { count: "exact", head: true }).eq("subject_id", subject_id);

    const { data, error } = await adminClient
      .from("chapters")
      .insert({
        subject_id,
        name: name.trim(),
        slug,
        display_order: (count || 0) + 1,
      })
      .select("id, name, subject_id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/practice");
    revalidatePath("/learning");
    revalidatePath("/", "layout");

    return { success: true, chapter: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create chapter.";
    return { success: false, error: msg };
  }
}

export async function deleteAdminChapter(chapterId: string) {
  try {
    const adminClient = createAdminClient();

    // 1. Unlink any questions referencing this chapter or its subtopics in Supabase
    await adminClient
      .from("questions")
      .update({ chapter_id: null, topic_id: null })
      .eq("chapter_id", chapterId);

    // 2. Delete all subtopics in this chapter
    await adminClient.from("topics").delete().eq("chapter_id", chapterId);

    // 3. Delete the chapter in Supabase
    const { error } = await adminClient.from("chapters").delete().eq("id", chapterId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/practice");
    revalidatePath("/learning");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete chapter.";
    return { success: false, error: msg };
  }
}

export async function createAdminTopic(chapter_id: string, name: string) {
  try {
    if (!name.trim()) return { success: false, error: "Topic name is required." };
    const adminClient = createAdminClient();
    const cleanSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    const { count } = await adminClient.from("topics").select("*", { count: "exact", head: true }).eq("chapter_id", chapter_id);

    const { data, error } = await adminClient
      .from("topics")
      .insert({
        chapter_id,
        name: name.trim(),
        slug,
        display_order: (count || 0) + 1,
      })
      .select("id, name, chapter_id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/practice");
    revalidatePath("/learning");
    revalidatePath("/", "layout");

    return { success: true, topic: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create topic.";
    return { success: false, error: msg };
  }
}

export async function deleteAdminTopic(topicId: string) {
  try {
    const adminClient = createAdminClient();

    // 1. Unlink any questions referencing this subtopic in Supabase
    await adminClient
      .from("questions")
      .update({ topic_id: null })
      .eq("topic_id", topicId);

    // 2. Delete topic row in Supabase
    const { error } = await adminClient.from("topics").delete().eq("id", topicId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin");
    revalidatePath("/practice");
    revalidatePath("/learning");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete topic.";
    return { success: false, error: msg };
  }
}

export interface TopicLearningContentInput {
  name?: string;
  summary?: string;
  explanation?: string;
  formulas?: string;
  resources?: {
    title: string;
    url: string;
    type: "pdf" | "book" | "formula_sheet" | "notes" | "link";
  }[];
}

export async function updateTopicLearningContent(
  topicId: string,
  content: TopicLearningContentInput
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required." };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();

    const payload = JSON.stringify({
      summary: content.summary || "",
      explanation: content.explanation || "",
      formulas: content.formulas || "",
      resources: content.resources || [],
    });

    const updateObj: Record<string, unknown> = {
      description: payload,
    };

    if (content.name && content.name.trim()) {
      updateObj.name = content.name.trim();
    }

    const { data, error } = await adminClient
      .from("topics")
      .update(updateObj)
      .eq("id", topicId)
      .select("id, name, description, chapter_id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/learning");
    revalidatePath("/practice");
    revalidatePath("/", "layout");

    return { success: true, topic: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update learning content.";
    return { success: false, error: msg };
  }
}

export async function updateAdminQuestion(
  questionId: string,
  input: CreateQuestionInput
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Authentication required." };

    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    const adminClient = createAdminClient();

    // 1. Update basic question fields
    const { error: qErr } = await adminClient
      .from("questions")
      .update({
        subject_id: input.subject_id,
        chapter_id: input.chapter_id || null,
        topic_id: input.topic_id || null,
        exam_id: input.exam_id || null,
        section_id: input.section_id || null,
        question_text: input.question_text.trim(),
        difficulty: input.difficulty,
        explanation: input.explanation ? input.explanation.trim() : null,
        marks: input.marks || 1,
        negative_marks: input.negative_marks || 0.25,
      })
      .eq("id", questionId);

    if (qErr) {
      return { success: false, error: qErr.message };
    }

    // 2. Update options: delete existing and reinsert
    await adminClient.from("question_answer_keys").delete().eq("question_id", questionId);
    await adminClient.from("question_options").delete().eq("question_id", questionId);

    const optionsPayload = input.options.map((opt, idx) => ({
      question_id: questionId,
      option_label: opt.label.toUpperCase(),
      option_text: opt.text.trim(),
      display_order: idx + 1,
    }));

    const { data: insertedOptions, error: optErr } = await adminClient
      .from("question_options")
      .insert(optionsPayload)
      .select("id, option_label");

    if (optErr || !insertedOptions) {
      return { success: false, error: "Failed to update options." };
    }

    // 3. Set answer key
    const correctOpt = insertedOptions.find(
      (o) => o.option_label === input.correct_option_label.toUpperCase()
    );

    if (correctOpt) {
      await adminClient.from("question_answer_keys").insert({
        question_id: questionId,
        correct_option_id: correctOpt.id,
      });
    }

    // 4. Update marks in test_questions if linked
    await adminClient.from("test_questions").update({
      marks: input.marks || 1,
      negative_marks: input.negative_marks || 0.25,
    }).eq("question_id", questionId);

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update question.";
    return { success: false, error: msg };
  }
}

/**
 * Purge all duplicate questions and orphan seed questions from Supabase.
 * Retains only unique questions belonging to active mock tests.
 */
export async function purgeDuplicateAndOrphanQuestions() {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch all questions from Supabase
    const { data: allQuestions } = await adminClient
      .from("questions")
      .select("id, question_text, status, topic_id")
      .order("created_at", { ascending: true });

    if (!allQuestions || allQuestions.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Fetch all test_questions
    const { data: allTestQuestions } = await adminClient
      .from("test_questions")
      .select("test_id, question_id");

    const OLD_TEST_IDS = new Set([
      "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
      "64a2c6a7-77eb-426e-bc3f-c492865aac77",
      "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
    ]);

    const { data: activeTests } = await adminClient
      .from("tests")
      .select("id")
      .neq("status", "archived");

    const validTestIds = new Set(
      (activeTests || []).filter((t) => !OLD_TEST_IDS.has(t.id)).map((t) => t.id)
    );

    const activeQuestionIds = new Set(
      (allTestQuestions || [])
        .filter((tq) => validTestIds.has(tq.test_id))
        .map((tq) => tq.question_id)
    );

    // Identify duplicate or orphan questions to delete
    const seenTexts = new Set<string>();
    const toDeleteIds: string[] = [];

    for (const q of allQuestions) {
      const norm = (q.question_text || "").trim().toLowerCase().replace(/\s+/g, " ");
      const isLinked = activeQuestionIds.has(q.id);
      const isTopicPracticeQuestion = Boolean(q.topic_id);

      // Keep questions linked to mock tests and standalone topic practice questions.
      if ((!isLinked && !isTopicPracticeQuestion) || seenTexts.has(norm)) {
        toDeleteIds.push(q.id);
      } else {
        seenTexts.add(norm);
      }
    }

    if (toDeleteIds.length === 0) {
      return { success: true, count: 0 };
    }

    // 3. In Supabase, archive them first
    await adminClient
      .from("questions")
      .update({ status: "archived" })
      .in("id", toDeleteIds);

    // 4. Delete dependent options, answer keys, and test relations
    try {
      await adminClient.from("question_answer_keys").delete().in("question_id", toDeleteIds);
      await adminClient.from("question_options").delete().in("question_id", toDeleteIds);
      await adminClient.from("test_questions").delete().in("question_id", toDeleteIds);
      await adminClient.from("attempt_questions").delete().in("question_id", toDeleteIds);
    } catch (e) {
      console.warn("Cascade delete notice:", e);
    }

    // 5. Delete from questions table in Supabase (or retain archived if constraint active)
    try {
      await adminClient.from("questions").delete().in("id", toDeleteIds);
    } catch (e) {
      console.warn("Questions hard delete notice (retained as archived):", e);
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");
    revalidatePath("/", "layout");

    return { success: true, count: toDeleteIds.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to purge duplicate questions.";
    return { success: false, error: msg };
  }
}

/**
 * Direct password reset action:
 * Updates the user's password directly in Supabase auth without requiring localhost redirects.
 */
export async function directResetPasswordAction(email: string, newPassword: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: "Email address is required." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    const adminClient = createAdminClient();
    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      console.error("List users error:", listErr);
      return { success: false, error: listErr.message };
    }

    const targetUser = (usersData?.users || []).find(
      (u) => (u.email || "").trim().toLowerCase() === normalizedEmail
    );

    if (!targetUser) {
      return {
        success: false,
        error: `No account registered with "${normalizedEmail}". Please make sure you entered the email you used to register.`,
      };
    }

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateErr) {
      console.error("Update password error in Supabase:", updateErr);
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset password.";
    return { success: false, error: msg };
  }
}

/**
 * Send password reset email and generate recovery link:
 * Validates the email exists in Supabase, triggers reset password email,
 * and provides a fallback link if Supabase email rate limits are encountered.
 */
export async function sendPasswordResetEmailAction(email: string, origin: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: "Please enter your registered email address." };
    }

    const adminClient = createAdminClient();
    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      console.error("List users error:", listErr);
      return { success: false, error: listErr.message };
    }

    const targetUser = (usersData?.users || []).find(
      (u) => (u.email || "").trim().toLowerCase() === normalizedEmail
    );

    if (!targetUser) {
      return {
        success: false,
        error: `No account found with email "${normalizedEmail}". Please enter the email you registered with.`,
      };
    }

    const redirectUrl = `${origin}/reset-password`;

    // 1. Generate recovery link via Admin API
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkErr) {
      console.warn("generateLink warning:", linkErr);
    }

    let directRecoveryUrl = linkData?.properties?.action_link || null;
    if (directRecoveryUrl && origin && !origin.includes("localhost")) {
      directRecoveryUrl = directRecoveryUrl
        .replace(/redirect_to=http%3A%2F%2Flocalhost%3A3000/gi, `redirect_to=${encodeURIComponent(origin)}`)
        .replace(/redirect_to=http:\/\/localhost:3000/gi, `redirect_to=${origin}`);
    }

    // 2. Trigger standard Supabase reset password email
    const supabase = await createClient();
    const { error: emailErr } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
    });

    const isRateLimited = emailErr ? emailErr.message.toLowerCase().includes("rate limit") : false;

    return {
      success: true,
      email: normalizedEmail,
      emailSent: !emailErr,
      rateLimited: isRateLimited,
      directRecoveryUrl,
      resetPageUrl: `${origin}/reset-password?email=${encodeURIComponent(normalizedEmail)}`,
      errorMessage: emailErr?.message || null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send reset link.";
    return { success: false, error: msg };
  }
}



