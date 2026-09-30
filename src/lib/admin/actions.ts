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

