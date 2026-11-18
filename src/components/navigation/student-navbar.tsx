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

  // Derive human-readable mobile screen title for subpages
  const getMobileTitle = () => {
    if (pathname === "/dashboard") return "IIITH PREP";
    if (pathname.startsWith("/tests/")) return "Test Details";
    if (pathname.startsWith("/tests")) return "Mock Tests";
    if (pathname.startsWith("/learning")) return "Curriculum";
    if (pathname.startsWith("/practice")) return "Practice";
    if (pathname.startsWith("/attempts/") && pathname.endsWith("/result")) return "Scorecard";
    if (pathname.startsWith("/attempts/") && pathname.endsWith("/review")) return "Solutions";
    if (pathname.startsWith("/attempts")) return "My Results";
    if (pathname.startsWith("/profile")) return "Student Profile";
    return "IIITH PREP";
  };

  const isRootDashboard = pathname === "/dashboard";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl w-full pt-safe transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16">
          {/* MOBILE BAR (md:hidden) */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Left: Back button or App Emblem */}
            <div className="flex items-center gap-2.5">
              {!isRootDashboard ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 transition-all shadow-xs"
                  aria-label="Go Back"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2E3AE3] to-[#1D2696] text-white shadow-md shadow-[#2E3AE3]/25 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
              )}

              <div>
                <h1 className="text-base font-black tracking-tight text-[#1F2227] leading-none">
                  {getMobileTitle()}
                </h1>
                {isRootDashboard && (
                  <span className="text-[10px] font-bold text-[#2E3AE3] tracking-wider uppercase block mt-0.5">
                    UGEE & SPEC
                  </span>
                )}
              </div>
            </div>

            {/* Right: Quick actions (Admin badge & Profile Avatar & Sign Out) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={true}
                  className="rounded-full bg-slate-900 text-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-xs active:scale-95 transition-transform flex items-center gap-1"
                >
                  <span>🛡️</span>
                  <span>Admin</span>
                </Link>
              )}

              <Link
                href="/profile"
                prefetch={true}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 active:scale-95 transition-transform shadow-2xs"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF2FF] text-xs">
                  {avatarUrl && avatarUrl.length < 5 ? avatarUrl : "👨‍🎓"}
                </span>
                <span className="text-[10px] font-extrabold text-[#2E3AE3]">
                  {studentYear || "P1/P2"}
                </span>
                {!isProfileComplete && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Profile Incomplete" />
                )}
              </Link>

              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 active:scale-95 transition-all shadow-2xs"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <span className="text-sm leading-none">🚪</span>
              </button>
            </div>
          </div>

          {/* DESKTOP BAR (hidden md:flex) */}
          <div className="hidden md:flex items-center justify-between w-full">
            {/* Desktop Brand */}
            <div className="flex items-center gap-3">
              {!isRootDashboard && (
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2E3AE3] to-[#1D2696] text-white shadow-md shadow-[#2E3AE3]/25 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <div>
                  <span className="text-base font-black tracking-tight text-[#1F2227] leading-none block">
                    IIITH PREP
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E3AE3] block mt-0.5">
                    CBT Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
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
                className={`hover:text-[#2E3AE3] transition-colors ${
                  pathname === "/learning" ? "text-[#2E3AE3] font-black" : ""
                }`}
              >
                My Learning
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
                My Results
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={true}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1 text-[11px] font-bold hover:bg-slate-800"
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
          </div>
        </div>

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
      <div className="h-14 sm:h-16 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
