import { redirect } from "next/navigation";
import { getCachedAuthUser } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { ProfileForm } from "@/components/profile/profile-form";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const user = await getCachedAuthUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getStudentProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5 sm:py-7 font-sans">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1F2227]">
          Student Profile
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Manage your personal details, academic year (P1 / P2), and view CBT mock test access.
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </main>
  );
}
