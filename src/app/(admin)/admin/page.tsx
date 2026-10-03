import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";
import { purgeDuplicateAndOrphanQuestions } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

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

  const oldTestIds = [
    "587d3e0d-da6e-4b20-bc98-5339ae1f1f1e",
    "64a2c6a7-77eb-426e-bc3f-c492865aac77",
    "c0d075f7-3af9-4aee-8b9a-7321b2885ead",
  ];

  // Load foundational data in parallel
  const [
    { data: subjects },
    { data: chapters },
    { data: topics },
    { data: exams },
    { data: rawTests },
    { data: usersList },
    { data: adminRows },
  ] = await Promise.all([
    adminClient.from("subjects").select("id, name, slug").order("display_order", { ascending: true }),
    adminClient.from("chapters").select("id, name, subject_id").order("display_order", { ascending: true }),
    adminClient.from("topics").select("id, name, chapter_id, description").order("display_order", { ascending: true }),
    adminClient.from("exams").select("id, name, slug"),
    adminClient.from("tests").select("id, name, slug, duration_seconds, test_type, exam_id, description, status").neq("status", "archived").order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers(),
    adminClient.from("admin_users").select("user_id"),
  ]);

  const oldTestIdSet = new Set(oldTestIds);
  const tests = (rawTests || []).filter((t) => !oldTestIdSet.has(t.id));
  const validTestIds = tests.map((t) => t.id);

  // Fetch questions from Supabase linked to active mock tests or authored
  type AdminQuestionItem = {
    id: string;
    subject_id?: string;
    chapter_id?: string | null;
    topic_id?: string | null;
    exam_id?: string | null;
    question_text: string;
    difficulty: string;
    marks: number;
    negative_marks: number;
    explanation: string | null;
    subject: { id: string; name: string } | null;
    options: { id: string; option_label: string; option_text: string; display_order?: number }[];
    answer_key: { correct_option_id: string }[] | null;
    test_questions?: { test_id: string; display_order: number }[];
  };
  let initialQuestions: AdminQuestionItem[] = [];

  const { data: rawQuestions } = await adminClient
    .from("questions")
    .select(`
      id,
      subject_id,
      chapter_id,
      topic_id,
      exam_id,
      question_text,
      difficulty,
      marks,
      negative_marks,
      explanation,
      created_at,
      subject:subjects(id, name),
      options:question_options(id, option_label, option_text, display_order),
      answer_key:question_answer_keys(correct_option_id),
      test_questions:test_questions(test_id, display_order)
    `)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  // Deduplicate by normalized question text so duplicate seed questions are not shown
  const seenTexts = new Set<string>();
  initialQuestions = ((rawQuestions as unknown as AdminQuestionItem[]) || []).filter((q) => {
    const norm = (q.question_text || "").trim().toLowerCase();
    if (seenTexts.has(norm)) return false;
    seenTexts.add(norm);
    return true;
  });

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
      tests={tests}
      initialQuestions={initialQuestions}
      adminUsersList={enrolledAdmins}
    />
  );
}
