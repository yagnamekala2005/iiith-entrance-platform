"use server";

import { revalidatePath } from "next/cache";
import { getCachedAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markChapterCompleted(chapterId: string) {
  const user = await getCachedAuthUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  if (!chapterId) {
    return { success: false, error: "Invalid chapter." };
  }

  const supabase = await createClient();

  const { error: upsertError } = await supabase
    .from("user_learning_chapter_progress")
    .upsert(
      {
        user_id: user.id,
        chapter_id: chapterId,
      },
      { onConflict: "user_id,chapter_id" },
    );

  if (upsertError) {
    console.error("Failed to save chapter completion:", upsertError);
    return { success: false, error: "Unable to save chapter progress." };
  }

  const [{ count: totalChapters, error: totalError }, { count: completedChapters, error: completedError }] =
    await Promise.all([
      supabase
        .from("chapters")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("user_learning_chapter_progress")
        .select("chapter_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  if (totalError || completedError) {
    console.error("Failed to calculate learning progress:", {
      totalError,
      completedError,
    });
    return { success: true, completedChapters: 0, totalChapters: 0, percentage: 0 };
  }

  const completed = completedChapters || 0;
  const total = totalChapters || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  revalidatePath("/learning");
  revalidatePath("/dashboard");

  return {
    success: true,
    completedChapters: completed,
    totalChapters: total,
    percentage,
  };
}
