import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCachedUserAndRole } from "@/lib/auth/session";
import { MobileSignIn } from "@/components/auth/mobile-sign-in";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { user, isAdmin } = await getCachedUserAndRole();

  // If already logged in, take the student/admin directly into their dashboard
  if (user) {
    if (isAdmin) {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  // First opening: Show the clean, native mobile app sign-in screen
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E3AE3] border-t-transparent" />
        </div>
      }
    >
      <MobileSignIn initialRole="student" />
    </Suspense>
  );
}
