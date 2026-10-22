"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoutConfirmModal } from "./logout-confirm-modal";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
  redirectPath?: string;
  roleLabel?: string;
}

export default function SignOutButton({
  className = "text-slate-500 font-semibold hover:text-rose-600 transition-colors",
  children = "Sign out",
  redirectPath = "/",
  roleLabel = "Student",
}: SignOutButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleConfirmSignOut() {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsConfirming(false);
      router.push(redirectPath);
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      setIsConfirming(false);
    }
  }

  return (
    <>
      <button
        className={className}
        onClick={() => setIsConfirming(true)}
        type="button"
        title="Sign out of your session"
      >
        {children}
      </button>

      <LogoutConfirmModal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={handleConfirmSignOut}
        isLoading={isLoggingOut}
        title="Log Out Confirmation"
        message={`You are logging out of your ${roleLabel} account. Are you sure you want to proceed?`}
        confirmText="Yes, Log Out"
        cancelText="Cancel"
      />
    </>
  );
}
