import { redirect } from "next/navigation";
import { getCachedUserAndRole } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { ProfileForm } from "@/components/profile/profile-form";
import { TermsAndConditionsCard } from "@/components/profile/terms-and-conditions-card";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const { user } = await getCachedUserAndRole();

  if (!user) {
    redirect("/login");
  }

  const profile = await getStudentProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-3.5 py-4 sm:px-6 sm:py-6 font-sans">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1F2227]">
          Student Profile
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Personal details &amp; examination records
        </p>
      </div>

      <ProfileForm initialProfile={profile} />

      {/* Terms & Conditions (collapsible box replacing Admin Console) */}
      <TermsAndConditionsCard />
    </main>
  );
}
