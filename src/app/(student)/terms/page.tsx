import React from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TERMS_LIST = [
  {
    num: "1",
    icon: "🌐",
    title: "Independent Platform",
    content:
      "This application is independently developed and is not officially affiliated with, associated with, or endorsed by IIIT Hyderabad.",
  },
  {
    num: "2",
    icon: "💳",
    title: "No Refund Policy",
    content:
      "All successful payments are final and non-refundable. Refunds or cancellations are not permitted after payment, except where required by applicable law or in cases covered by our payment issue policy.",
  },
  {
    num: "3",
    icon: "🧾",
    title: "Payment Responsibility",
    content:
      "Users must verify test details and pricing before making payments. Duplicate payments or failed transactions can be reported to the support team.",
  },
  {
    num: "4",
    icon: "🔐",
    title: "Account Security",
    content:
      "Users are responsible for maintaining their login credentials and must not share their accounts with others.",
  },
  {
    num: "5",
    icon: "🎯",
    title: "Educational Purpose",
    content:
      "Mock tests are intended only for practice and preparation. They do not guarantee admission, examination success, or specific scores.",
  },
  {
    num: "6",
    icon: "🛡️",
    title: "Content Protection",
    content:
      "Copying, downloading, reproducing, or distributing paid test content without permission is prohibited.",
  },
  {
    num: "7",
    icon: "⚖️",
    title: "Fair Usage",
    content:
      "Hacking, cheating, fraudulent activities, or misuse of the application may result in account suspension.",
  },
  {
    num: "8",
    icon: "⚡",
    title: "Service Availability",
    content:
      "We are not responsible for temporary interruptions caused by maintenance, technical issues, or network failures beyond our reasonable control.",
  },
  {
    num: "9",
    icon: "📋",
    title: "Limitation of Liability",
    content:
      "We do not guarantee the accuracy of actual examination patterns, questions, or results.",
  },
  {
    num: "10",
    icon: "🔄",
    title: "Policy Updates",
    content:
      "We reserve the right to modify these Terms and Conditions when necessary. Updated terms will be published in the application.",
  },
  {
    num: "11",
    icon: "✍️",
    title: "User Agreement",
    content:
      "By registering, accessing, or purchasing services through this application, users agree to these Terms and Conditions, subject to applicable law.",
  },
  {
    num: "12",
    icon: "🏛️",
    title: "No Institutional Affiliation",
    content:
      "This application is independently developed and operated. It is not affiliated with, associated with, sponsored by, or officially connected to RGUKT, IIIT Hyderabad, or any other college, university, or educational institution. All content and services are independently provided.",
  },
];

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto max-w-2xl px-3.5 py-4 sm:px-6 sm:py-6 font-sans space-y-4">
      {/* App Header with Back navigation */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/profile"
            prefetch={true}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition-all shadow-2xs text-slate-700"
            aria-label="Back to Profile"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              IIITH Entrance Mock Test Platform
            </p>
          </div>
        </div>

        <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-black text-[#2E3AE3] uppercase tracking-wider border border-[#2E3AE3]/20 shrink-0">
          Official
        </span>
      </div>

      {/* Intro Overview Card */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-[#F4F7FF] to-[#EEF2FF] p-4 shadow-2xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <h2 className="text-xs font-black uppercase tracking-wider text-[#2E3AE3]">
            Platform Agreement &amp; Policies
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Please review these terms and conditions carefully. By registering, accessing, or purchasing mock tests on this application, you agree to comply with all policies outlined below.
        </p>
      </div>

      {/* 12 Detailed Points */}
      <div className="space-y-3 pt-1">
        {TERMS_LIST.map((item) => (
          <div
            key={item.num}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.icon}</span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  {item.num}. {item.title}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Rule #{item.num}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal pl-6">
              {item.content}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Back Button */}
      <div className="pt-3 pb-6">
        <Link
          href="/profile"
          prefetch={true}
          className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-98 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center justify-center gap-2 text-center"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
          <span>Back to Profile</span>
        </Link>
      </div>
    </main>
  );
}

