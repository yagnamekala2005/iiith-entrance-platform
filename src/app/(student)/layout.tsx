import { getCachedUserAndRole } from "@/lib/auth/session";
import { StudentNavbar } from "@/components/navigation/student-navbar";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, isAdmin } = await getCachedUserAndRole();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden w-full max-w-full relative">
      <StudentNavbar userEmail={user?.email || "Student"} isAdmin={isAdmin} />
      <div className="flex-1 overflow-x-hidden w-full max-w-full">{children}</div>
    </div>
  );
}
