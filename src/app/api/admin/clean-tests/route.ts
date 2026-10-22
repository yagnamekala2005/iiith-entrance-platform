import { NextResponse } from "next/server";
import { authorizeAdminAction } from "@/lib/admin/authorization";
import { purgeDuplicateAndOrphanQuestions } from "@/lib/admin/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/security/body";
import { hasValidOrigin } from "@/lib/security/origin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { cleanupConfirmationSchema, validateInput } from "@/lib/security/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const authorization = await authorizeAdminAction();
  if (!authorization.ok) {
    return NextResponse.json({ error: authorization.error }, {
      status: authorization.error === "Authentication required." ? 401 : 403,
    });
  }

  try {
    const limit = await checkRateLimit("admin-clean-tests", 1, 3600, authorization.userId, request.headers);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Cleanup has already run recently. Try again later." }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request, 4 * 1024);
    if (!body.ok) return NextResponse.json({ error: "Invalid cleanup request." }, { status: body.status });
    const validation = validateInput<{ confirmation: string }>(cleanupConfirmationSchema, body.value);
    if (validation.error) {
      return NextResponse.json({ error: "Explicit cleanup confirmation is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: attempts, error: attemptLookupError } = await admin.from("test_attempts").select("id");
    if (attemptLookupError) throw attemptLookupError;
    if (attempts?.length) {
      const attemptIds = attempts.map((attempt) => attempt.id);
      const { error: answerDeleteError } = await admin.from("attempt_questions").delete().in("attempt_id", attemptIds);
      if (answerDeleteError) throw answerDeleteError;
      const { error: attemptDeleteError } = await admin
        .from("test_attempts")
        .delete()
        .in("id", attemptIds);
      if (attemptDeleteError) throw attemptDeleteError;
    }

    const { error: questionDeleteError } = await admin
      .from("test_questions")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (questionDeleteError) throw questionDeleteError;
    const { error: sectionDeleteError } = await admin
      .from("test_sections")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (sectionDeleteError) throw sectionDeleteError;

    const oldTestIds = [
      "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
      "64a2c6a7-77eb-426e-bc3f-c492865aac77",
      "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
    ];
    const { error: archiveError } = await admin
      .from("tests")
      .update({ status: "archived" })
      .in("id", oldTestIds);
    if (archiveError) throw archiveError;
    const { error: testDeleteError } = await admin.from("tests").delete().in("id", oldTestIds);
    if (testDeleteError) throw testDeleteError;

    const purgeResult = await purgeDuplicateAndOrphanQuestions();
    if (!purgeResult.success) throw new Error(purgeResult.error || "Question cleanup failed.");

    return NextResponse.json({
      success: true,
      message: "Cleanup completed.",
      purgedResult: purgeResult,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin test cleanup failed:", error);
    return NextResponse.json({ error: "Test cleanup could not be completed." }, { status: 500 });
  }
}
