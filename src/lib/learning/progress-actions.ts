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

  const { error } = await supabase
    .from("user_learning_chapter_progress")
    .upsert(
      {
        user_id: user.id,
        chapter_id: chapterId,
      },
      { onConflict: "user_id,chapter_id" },
    );

  if (error) {
    return { success: false, error: "Unable to save chapter progress." };
  }

  revalidatePath("/learning");
  revalidatePath("/dashboard");

  return { success: true };
}
