import Link from "next/link";
import SignOutButton from "@/components/auth/sign-out-button";

export default function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link className="text-sm font-semibold tracking-[0.16em] text-teal-800" href="/dashboard">
            IIITH PREP
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-600">
            <Link className="hover:text-teal-800" href="/dashboard">Dashboard</Link>
            <Link className="hover:text-teal-800" href="/practice">Practice</Link>
            <Link className="hover:text-teal-800" href="/tests">Mock Tests</Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
