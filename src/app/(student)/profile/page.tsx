import Link from "next/link";
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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 font-sans">
      {/* 1-Step Back Navigation */}
      <div className="mb-3">
        <Link
          href="/dashboard"
          prefetch={true}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
          title="Return to Student Dashboard"
        >
          <span className="text-sm font-black leading-none">‹</span>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
        <Link href="/dashboard" className="hover:text-blue-700">Dashboard</Link>
        <span>/</span>
        <span className="text-blue-700">My Student Profile</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Student Profile & Access
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          Manage your personal details, academic year (P1 / P2), and view your free CBT mock test subscription.
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </main>
  );
}

