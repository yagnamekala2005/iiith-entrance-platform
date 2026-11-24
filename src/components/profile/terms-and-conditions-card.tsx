import React from "react";
import Link from "next/link";

export function TermsAndConditionsCard() {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-50/50 active:scale-[0.99]">
      <Link
        href="/terms"
        prefetch={true}
        className="flex items-center justify-between p-4 group cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">📜</span>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 group-hover:text-[#2E3AE3] transition-colors">
              Terms &amp; Conditions
            </p>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
            Platform policies &amp; user agreement
          </p>
        </div>
      </Link>
    </div>
  );
}
