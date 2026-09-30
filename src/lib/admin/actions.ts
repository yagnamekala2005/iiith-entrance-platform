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
        // Find highest display order in test
        const { count } = await adminClient
          .from("test_questions")
          .select("*", { count: "exact", head: true })
          .eq("test_id", testId);

        const newOrder = (count || 0) + 1;

        await adminClient.from("test_questions").insert({
          test_id: testId,
          question_id: newQ.id,
          section_id: input.section_id || null,
          display_order: newOrder,
          marks: input.marks || 1,
          negative_marks: input.negative_marks || 0.25,
        });
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

    // Delete test_questions link first
    await adminClient.from("test_questions").delete().eq("question_id", questionId);
    // Delete answer key
    await adminClient.from("question_answer_keys").delete().eq("question_id", questionId);
    // Delete options
    await adminClient.from("question_options").delete().eq("question_id", questionId);
    // Delete question
    const { error: delErr } = await adminClient.from("questions").delete().eq("id", questionId);

    if (delErr) {
      return { success: false, error: delErr.message };
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
        status: "published",
      })
      .select("id, name, slug, duration_seconds, test_type, exam_id")
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

    // 1. Delete associated attempts and attempt answers/sections if any
    const { data: testAttempts } = await adminClient
      .from("attempts")
      .select("id")
      .eq("test_id", testId);

    if (testAttempts && testAttempts.length > 0) {
      const attemptIds = testAttempts.map((a) => a.id);
      await adminClient.from("attempt_answers").delete().in("attempt_id", attemptIds);
      await adminClient.from("attempt_sections").delete().in("attempt_id", attemptIds);
      await adminClient.from("attempts").delete().eq("test_id", testId);
    }

    // 2. Delete test_questions
    await adminClient.from("test_questions").delete().eq("test_id", testId);

    // 3. Delete test_sections
    await adminClient.from("test_sections").delete().eq("test_id", testId);

    // 4. Delete from tests table
    const { error: delErr } = await adminClient.from("tests").delete().eq("id", testId);

    if (delErr) {
      console.error("Error deleting test:", delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/tests");

    return { success: true };
  } catch (err) {
    console.error("deleteAdminMockTest error:", err);
    return { success: false, error: "Failed to delete mock test." };
  }
}

export async function publishAdminMockTest(testId: string) {
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

    return { success: true, test: updatedTest };
  } catch (err) {
    console.error("publishAdminMockTest error:", err);
    return { success: false, error: "Failed to publish mock test." };
  }
}


