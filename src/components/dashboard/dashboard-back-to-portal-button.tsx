"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutConfirmModal } from "@/components/auth/logout-confirm-modal";

export function DashboardBackToPortalButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmExit = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-95 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all shadow-2xs"
        title="Return to Entrance Home Portal (Confirms Log Out)"
      >
        <span className="text-sm font-black leading-none">‹</span>
        <span>Back to Entrance Portal</span>
      </button>

      <LogoutConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirmExit}
        isLoading={isLoading}
        title="Log Out Confirmation"
        message="You are exiting from the student portal. Are you sure you want to log out and return to the entrance portal?"
        confirmText="Yes, Log Out"
        cancelText="Cancel"
      />
    </>
  );
}

