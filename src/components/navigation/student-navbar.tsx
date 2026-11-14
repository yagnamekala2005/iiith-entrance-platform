"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";
import { createClient } from "@/lib/supabase/client";

interface StudentNavbarProps {
  userEmail: string;
  isAdmin: boolean;
  isProfileComplete?: boolean;
  studentYear?: string;
  avatarUrl?: string;
}

export function StudentNavbar({
  userEmail,
  isAdmin,
  isProfileComplete = false,
  studentYear = "",
  avatarUrl = "",
}: StudentNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Intercept back navigation when on root dashboard so user is prompted before exiting session
  useEffect(() => {
    if (pathname !== "/dashboard" || typeof window === "undefined") return;

    if (window.history.state?.studentDashboard !== true) {
      window.history.pushState({ studentDashboard: true }, "");
    }

    const onPopState = () => {
      setIsExitConfirmOpen(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [pathname]);

  const handleBack = () => {
    if (pathname === "/dashboard") {
      setIsExitConfirmOpen(true);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  const handleConfirmExit = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsExitConfirmOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      setIsExitConfirmOpen(false);
    }
  };

  // Hide the navigation header completely while student is inside the live mock test taking interface
  const isTakingTest =
    pathname.startsWith("/attempts/") &&
    !pathname.endsWith("/result") &&
    !pathname.endsWith("/review");

  if (isTakingTest) {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl w-full pt-safe">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
          {/* Brand & Quick Back */}
          <div className="flex items-center gap-2 sm:gap-3">
            {pathname !== "/dashboard" && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 transition-all shadow-xs"
                title="Go to previous page"
              >
                <span className="text-base font-black leading-none">‹</span>
              </button>
            )}

            <Link href="/dashboard" prefetch={true} className="flex items-center gap-2.5 active:scale-98 transition-transform">
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#2E3AE3] text-white font-black text-xs shadow-md shadow-[#2E3AE3]/25">
                II
              </span>
              <div>
                <span className="text-sm sm:text-base font-black tracking-tight text-[#1F2227] leading-none block">
                  IIITH PREP
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#2E3AE3] block mt-0.5">
                  CBT Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Link
              href="/dashboard"
              prefetch={true}
              className={`hover:text-[#2E3AE3] transition-colors ${
                pathname === "/dashboard" ? "text-[#2E3AE3] font-black" : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              prefetch={true}
              className={`hover:text-[#2E3AE3] transition-colors flex items-center gap-1.5 ${
                pathname === "/profile" ? "text-[#2E3AE3] font-black" : ""
              }`}
            >
              <span>Profile</span>
              {!isProfileComplete && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Profile Incomplete" />
              )}
            </Link>
            <Link
              href="/learning"
              prefetch={true}
              className={`hover:text-[#2E3AE3] transition-colors flex items-center gap-1 ${
                pathname === "/learning" ? "text-[#2E3AE3] font-black" : ""
              }`}
            >
              <span>My Learning</span>
            </Link>
            <Link
              href="/tests"
              prefetch={true}
              className={`hover:text-[#2E3AE3] transition-colors ${
                pathname.startsWith("/tests") ? "text-[#2E3AE3] font-black" : ""
              }`}
            >
              Mock Tests
            </Link>
            <Link
              href="/attempts"
              prefetch={true}
              className={`hover:text-[#2E3AE3] transition-colors ${
                pathname.startsWith("/attempts") ? "text-[#2E3AE3] font-black" : ""
              }`}
            >
              My Attempts
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                prefetch={true}
                className="rounded-lg bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-slate-800"
              >
                Admin
              </Link>
            )}
            <div className="border-l border-slate-200 pl-4 flex items-center gap-3">
              <span className="text-xs text-slate-400 font-normal truncate max-w-[140px]">
                {userEmail}
              </span>
              <SignOutButton />
            </div>
          </nav>

          {/* Mobile Right Controls: Profile pill & Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 active:scale-95 transition-transform"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF2FF] text-xs">
                {avatarUrl && avatarUrl.length < 5 ? avatarUrl : "👨‍🎓"}
              </span>
              <span className="text-[11px] font-extrabold text-[#2E3AE3]">
                {studentYear || "Free"}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 p-2 active:scale-95 transition-all shadow-xs"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <span className="text-base font-bold leading-none">✕</span>
              ) : (
                <span className="text-base font-bold leading-none">☰</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-xl">
            <div className="text-xs text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Signed in as:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{userEmail}</span>
            </div>

            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <Link
                href="/dashboard"
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 hover:bg-slate-50 hover:text-[#2E3AE3] flex items-center justify-between font-bold"
              >
                <span>📊 Student Dashboard</span>
              </Link>
              <Link
                href="/profile"
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                  pathname === "/profile"
                    ? "bg-[#EEF2FF] text-[#2E3AE3] font-bold"
                    : "hover:bg-slate-50 hover:text-[#2E3AE3]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>My Profile</span>
                </div>
                {isProfileComplete ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {studentYear ? `${studentYear} • Free` : "Completed"}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                    Action Required
                  </span>
                )}
              </Link>
              <Link
                href="/learning"
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-3 py-2.5 flex items-center gap-2 ${
                  pathname === "/learning"
                    ? "bg-[#EEF2FF] text-[#2E3AE3] font-bold"
                    : "hover:bg-slate-50 hover:text-[#2E3AE3]"
                }`}
              >
                <span>📖</span>
                <span>My Learning (Curriculum)</span>
              </Link>
              <Link
                href="/tests"
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 hover:bg-slate-50 hover:text-[#2E3AE3] flex items-center justify-between"
              >
                <span>⏱️ Timed Mock Tests (UGEE & SPEC)</span>
                {!isProfileComplete && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Locked
                  </span>
                )}
              </Link>
              <Link
                href="/attempts"
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 hover:bg-slate-50 hover:text-[#2E3AE3]"
              >
                📈 My Exam Scorecards & Attempts
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 bg-slate-900 text-white font-bold"
                >
                  🛡️ Admin Authoring Studio
                </Link>
              )}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">IIITH Entrance CBT v2</span>
              <SignOutButton />
            </div>
          </div>
        )}

        {/* Exit Dashboard / Log Out Confirmation Modal */}
        <LogoutConfirmModal
          isOpen={isExitConfirmOpen}
          onClose={() => {
            setIsExitConfirmOpen(false);
            if (pathname === "/dashboard" && typeof window !== "undefined") {
              window.history.pushState({ studentDashboard: true }, "");
            }
          }}
          onConfirm={handleConfirmExit}
          isLoading={isLoggingOut}
          title="Log Out Confirmation"
          message="You are exiting from the student portal. Are you sure you want to log out and return to the entrance portal?"
          confirmText="Yes, Log Out"
          cancelText="Cancel"
        />
      </header>

      {/* Spacer to preserve document layout height so content is not obscured */}
      <div className="h-[54px] sm:h-[64px] w-full shrink-0" aria-hidden="true" />
    </>
  );
}
