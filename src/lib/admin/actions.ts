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

    // Use the service-role client for the admin membership check.
    // The normal user client may be blocked by RLS on admin_users, which
    // incorrectly made valid admins appear unauthorized.
    const adminClient = createAdminClient();
    const { data: adminMembership, error: adminCheckError } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminCheckError) {
      console.error("Admin membership check failed:", adminCheckError);
      return { success: false, error: "Unable to verify admin authorization." };
    }

    if (!adminMembership) {
      return { success: false, error: "Admin authorization required." };
    }

    if (!input.question_text.trim()) {
      return { success: false, error: "Question text is required." };
    }

    if (!input.options || input.options.length < 2) {
      return { success: false, error: "At least 2 options are required." };
    }

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



