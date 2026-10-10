"use server";

import { revalidatePath } from "next/cache";
import { getCachedAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markTopicCompleted(topicId: string) {
  const user = await getCachedAuthUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  if (!topicId) {
    return { success: false, error: "Invalid topic." };
  }

  const supabase = await createClient();

  const { error: upsertError } = await supabase
    .from("user_learning_topic_progress")
    .upsert(
      {
        user_id: user.id,
        topic_id: topicId,
      },
      { onConflict: "user_id,topic_id" },
    );

  if (upsertError) {
    console.error("Failed to save topic completion:", upsertError);
    return { success: false, error: "Unable to save topic progress." };
  }

  const [{ count: totalTopics, error: totalError }, { count: completedTopics, error: completedError }] =
    await Promise.all([
      supabase.from("topics").select("id", { count: "exact", head: true }),
      supabase
        .from("user_learning_topic_progress")
        .select("topic_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  if (totalError || completedError) {
    console.error("Failed to calculate topic learning progress:", {
      totalError,
      completedError,
    });
    return {
      success: true,
      completedTopics: 0,
      totalTopics: 0,
      percentage: 0,
    };
  }

  const completed = completedTopics || 0;
  const total = totalTopics || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  revalidatePath("/learning");
  revalidatePath("/dashboard");

  return {
    success: true,
    completedTopics: completed,
    totalTopics: total,
    percentage,
  };
}
