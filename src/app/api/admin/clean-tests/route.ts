import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeDuplicateAndOrphanQuestions } from "@/lib/admin/actions";

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // 1. Delete attempt_questions & test_attempts
    const { data: allAttempts } = await adminClient.from("test_attempts").select("id");
    if (allAttempts && allAttempts.length > 0) {
      const attemptIds = allAttempts.map((a) => a.id);
      await adminClient.from("attempt_questions").delete().in("attempt_id", attemptIds);
      await adminClient.from("test_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // 2. Delete test_questions
    await adminClient.from("test_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 3. Delete test_sections
    await adminClient.from("test_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Archive & delete old tests
    const OLD_TEST_IDS = [
      "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
      "64a2c6a7-77eb-426e-bc3f-c492865aac77",
      "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
    ];
    await adminClient.from("tests").update({ status: "archived" }).in("id", OLD_TEST_IDS);
    await adminClient.from("tests").delete().in("id", OLD_TEST_IDS);

    // 5. Purge all duplicate and orphan seed questions from Supabase
    const purgeResult = await purgeDuplicateAndOrphanQuestions();

    return NextResponse.json({
      success: true,
      message: "Successfully purged old tests, duplicate questions, and orphan seed questions from Supabase.",
      purgedResult: purgeResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

