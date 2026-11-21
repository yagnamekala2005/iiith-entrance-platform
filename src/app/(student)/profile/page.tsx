import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedUserAndRole } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/profile/queries";
import { ProfileForm } from "@/components/profile/profile-form";

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

      {isAdmin && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🛡️</span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Admin Console
              </p>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Question bank, test submissions &amp; plans
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-slate-800 active:scale-95 transition-all shrink-0 shadow-xs"
          >
            Open Admin
          </Link>
        </div>
      )}
    </main>
  );
}
