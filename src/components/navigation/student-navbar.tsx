"use client";

import React, { useState } from "react";
import Link from "next/link";
import SignOutButton from "@/components/auth/sign-out-button";

interface StudentNavbarProps {
  userEmail: string;
  isAdmin: boolean;
}

export function StudentNavbar({ userEmail, isAdmin }: StudentNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
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
          <Link href="/dashboard" className="hover:text-blue-700 transition-colors">
            Dashboard
          </Link>
          <Link href="/tests" className="hover:text-blue-700 transition-colors">
            Mock Tests
          </Link>
          <Link href="/practice" className="hover:text-blue-700 transition-colors">
            Practice Bank
          </Link>
          <Link href="/attempts" className="hover:text-blue-700 transition-colors">
            My Attempts
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-sky-300 hover:bg-slate-800 transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>🛡️</span>
              <span>Admin Studio</span>
            </Link>
          )}

          <div className="border-l border-slate-200 pl-4 flex items-center gap-3">
            <span className="text-xs text-slate-400 font-normal truncate max-w-[140px]">
              {userEmail}
            </span>
            <SignOutButton />
          </div>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-sky-300"
            >
              Admin
            </Link>
          )}
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
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              📊 Student Dashboard
            </Link>
            <Link
              href="/tests"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              ⏱️ Timed Mock Tests (UGEE & SPEC)
            </Link>
            <Link
              href="/practice"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              📚 4 Subjects Practice Bank
            </Link>
            <Link
              href="/attempts"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-blue-700"
            >
              📈 My Exam Scorecards & Attempts
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sky-300 font-bold"
              >
                🛡️ Open Admin Studio & Question Authoring
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">IIITH Entrance CBT</span>
            <SignOutButton />
          </div>
        </div>
      )}
    </header>
  );
}
