"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "⌂", matches: (path: string) => path === "/dashboard" },
  { href: "/learning", label: "Learn", icon: "▤", matches: (path: string) => path.startsWith("/learning") },
  { href: "/tests", label: "Mock Tests", icon: "◷", matches: (path: string) => path.startsWith("/tests") },
  { href: "/attempts", label: "Attempts", icon: "▥", matches: (path: string) => path.startsWith("/attempts") },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  // Keep the live examination surface completely unobstructed.
  if (pathname.startsWith("/attempts/") && !pathname.endsWith("/result") && !pathname.endsWith("/review")) {
    return null;
  }

  return (
    <nav aria-label="Primary navigation" className="mobile-bottom-nav md:hidden">
      {tabs.map((tab) => {
        const active = tab.matches(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(8);
              }
            }}
            className={`mobile-bottom-nav__item ${active ? "is-active" : ""}`}
          >
            <span aria-hidden="true" className="mobile-bottom-nav__icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
