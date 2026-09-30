import { createClient } from "@/lib/supabase/server";
import { StudentNavbar } from "@/components/navigation/student-navbar";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: adminMembership } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminMembership) {
      isAdmin = true;
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <StudentNavbar userEmail={user?.email || "Student"} isAdmin={isAdmin} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
