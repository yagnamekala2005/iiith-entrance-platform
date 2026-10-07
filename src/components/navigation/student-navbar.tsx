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
}

export function StudentNavbar({ userEmail, isAdmin }: StudentNavbarProps) {
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
  // (Full-screen dedicated CBT experience, reappears on scorecard / result page)
  const isTakingTest = pathname.startsWith("/attempts/") && !pathname.endsWith("/result");
  if (isTakingTest) {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Brand & Quick Back */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
            title={pathname === "/dashboard" ? "Return to Entrance Portal" : "Go to previous page"}
          >
            <span className="text-sm font-black leading-none">‹</span>
            <span className="text-[11px] uppercase tracking-wider hidden sm:inline">
              {pathname === "/dashboard" ? "Portal" : "Back"}
            </span>
          </button>

          <Link href="/dashboard" prefetch={true} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white font-black text-xs shadow-xs">
              II
            </span>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 leading-tight block">
                IIITH PREP
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                CBT Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
          <Link
            href="/dashboard"
            prefetch={true}
            className={`hover:text-blue-700 transition-colors ${
              pathname === "/dashboard" ? "text-blue-700" : ""
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/learning"
            prefetch={true}
            className={`hover:text-blue-700 transition-colors flex items-center gap-1 ${
              pathname === "/learning" ? "text-blue-700" : ""
            }`}
          >
            <span>📖</span>
            <span>My Learning</span>
          </Link>
          <Link
            href="/tests"
            prefetch={true}
            className={`hover:text-blue-700 transition-colors ${
              pathname.startsWith("/tests") ? "text-blue-700" : ""
            }`}
          >
            Mock Tests
          </Link>
          <Link
            href="/attempts"
            prefetch={true}
            className={`hover:text-blue-700 transition-colors ${
              pathname.startsWith("/attempts") ? "text-blue-700" : ""
            }`}
          >
            My Attempts
          </Link>
          <div className="border-l border-slate-200 pl-4 flex items-center gap-3">
            <span className="text-xs text-slate-400 font-normal truncate max-w-[140px]">
              {userEmail}
            </span>
            <SignOutButton />
          </div>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 p-2"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <span className="text-base font-bold">✕</span>
            ) : (
              <span className="text-base font-bold">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          <div className="text-xs text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Signed in as:</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]">{userEmail}</span>
          </div>

          <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleBack();
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 font-bold text-left border border-slate-200"
            >
              <span className="text-base font-black">‹</span>
              <span>{pathname === "/dashboard" ? "Back to Entrance Portal" : "Back to Previous Screen"}</span>
            </button>
            <Link
              href="/dashboard"
              prefetch={true}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              📊 Student Dashboard
            </Link>
            <Link
              href="/learning"
              prefetch={true}
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
                pathname === "/learning"
                  ? "bg-blue-50 text-blue-800 font-bold"
                  : "hover:bg-slate-50 hover:text-blue-700"
              }`}
            >
              <span>📖</span>
              <span>My Learning (Curriculum & Topics)</span>
            </Link>
            <Link
              href="/tests"
              prefetch={true}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              ⏱️ Timed Mock Tests (UGEE & SPEC)
            </Link>
            <Link
              href="/attempts"
              prefetch={true}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              📈 My Exam Scorecards & Attempts
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">IIITH Entrance CBT</span>
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
    <div className="h-[60px] sm:h-[64px] w-full shrink-0" aria-hidden="true" />
  </>
  );
}
