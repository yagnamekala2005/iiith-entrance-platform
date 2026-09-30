import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    redirect("/dashboard");
  }

  const adminClient = createAdminClient();

  // Load all foundational data in parallel
  const [
    { data: subjects },
    { data: chapters },
    { data: topics },
    { data: exams },
    { data: tests },
    { data: questions },
    { data: usersList },
    { data: adminRows },
  ] = await Promise.all([
    adminClient.from("subjects").select("id, name, slug").order("display_order", { ascending: true }),
    adminClient.from("chapters").select("id, name, subject_id").order("display_order", { ascending: true }),
    adminClient.from("topics").select("id, name, chapter_id").order("display_order", { ascending: true }),
    adminClient.from("exams").select("id, name, slug"),
    adminClient.from("tests").select("id, name, slug"),
    adminClient
      .from("questions")
      .select(`
        id,
        question_text,
        difficulty,
        marks,
        negative_marks,
        explanation,
        subject:subjects(id, name),
        options:question_options(id, option_label, option_text),
        answer_key:question_answer_keys(correct_option_id)
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    adminClient.auth.admin.listUsers(),
    adminClient.from("admin_users").select("user_id"),
  ]);

  const userEmailMap = new Map<string, string>();
  (usersList?.users || []).forEach((u) => {
    if (u.email) userEmailMap.set(u.id, u.email);
  });

  const enrolledAdmins = (adminRows || []).map((ar) => ({
    user_id: ar.user_id,
    email: userEmailMap.get(ar.user_id) || "admin@iiith.ac.in",
  }));

  return (
    <AdminPanel
      currentAdminEmail={user.email || ""}
      subjects={subjects || []}
      chapters={chapters || []}
      topics={topics || []}
      exams={exams || []}
      tests={tests || []}
      initialQuestions={(questions as unknown as any) || []}
      adminUsersList={enrolledAdmins}
    />
  );
}
