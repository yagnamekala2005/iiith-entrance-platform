import { getCachedUserAndRole } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { StudentNavbar } from "@/components/navigation/student-navbar";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";

export default async function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, isAdmin } = await getCachedUserAndRole();
  const profile = user ? await getStudentProfile(user.id) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans overflow-x-hidden w-full max-w-full relative">
      <StudentNavbar
        userEmail={user?.email || "Student"}
        isAdmin={isAdmin}
        isProfileComplete={profile?.is_completed ?? false}
        studentYear={profile?.academic_year || ""}
      />
      <main className="flex-1 overflow-x-hidden w-full max-w-full mobile-content-safe">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
