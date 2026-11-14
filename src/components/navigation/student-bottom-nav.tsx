"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudentBottomNavProps {
  isProfileComplete?: boolean;
}

export function StudentBottomNav({ isProfileComplete = false }: StudentBottomNavProps) {
  const pathname = usePathname();

  // Hide the bottom navigation bar completely during live CBT examination
  const isTakingTest =
    pathname.startsWith("/attempts/") &&
    !pathname.endsWith("/result") &&
    !pathname.endsWith("/review");

  if (isTakingTest) {
    return null;
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: (active: boolean) => (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      isActive: pathname === "/dashboard",
    },
    {
      href: "/learning",
      label: "Learn",
      icon: (active: boolean) => (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
      isActive: pathname.startsWith("/learning") || pathname.startsWith("/practice"),
    },
    {
      href: "/tests",
      label: "Mock Tests",
      icon: (active: boolean) => (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      isActive: pathname.startsWith("/tests"),
    },
    {
      href: "/attempts",
      label: "Results",
      icon: (active: boolean) => (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      isActive: pathname.startsWith("/attempts"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: (active: boolean) => (
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={active ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {!isProfileComplete && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          )}
        </div>
      ),
      isActive: pathname === "/profile",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] pb-safe transition-transform duration-200"
    >
      <div className="flex items-center justify-around px-2 py-1.5 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all active:scale-90 ${
                active
                  ? "text-[#2E3AE3] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div
                className={`flex items-center justify-center h-8 w-12 rounded-xl transition-all ${
                  active ? "bg-[#EEF2FF] text-[#2E3AE3]" : "text-slate-500"
                }`}
              >
                {item.icon(active)}
              </div>
              <span
                className={`text-[10px] tracking-tight leading-none mt-0.5 ${
                  active ? "font-bold text-[#2E3AE3]" : "text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

