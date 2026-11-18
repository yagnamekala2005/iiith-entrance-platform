import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedUserAndRole } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { ProfileForm } from "@/components/profile/profile-form";
import SignOutButton from "@/components/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const { user, isAdmin } = await getCachedUserAndRole();

  if (!user) {
    redirect("/login");
  }

  const profile = await getStudentProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5 sm:py-7 font-sans">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1F2227]">
            Student Profile
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Manage your personal details, academic year (P1 / P2), and view CBT mock test access.
          </p>
        </div>

        <SignOutButton
          className="rounded-2xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 active:scale-95 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-rose-700 transition-all flex items-center gap-1.5 shadow-2xs shrink-0"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </SignOutButton>
      </div>

      <ProfileForm initialProfile={profile} />

      {isAdmin && (
        <div className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🛡️</span>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                Admin Console
              </p>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Manage test question bank, student test submissions, and subscription plans.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-2xl bg-slate-900 text-white px-3.5 py-2 text-xs font-black uppercase tracking-wider hover:bg-slate-800 active:scale-95 transition-all shrink-0 shadow-xs"
          >
            Open Admin &rarr;
          </Link>
        </div>
      )}
    </main>
  );
}
