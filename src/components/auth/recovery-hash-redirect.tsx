"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RecoveryHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Supabase can return recovery errors in the URL fragment. Fragments are
    // not sent to the server, so catch them on the client and show the
    // password-recovery page instead of leaving the user on the home page.
    const hash = window.location.hash;
    if (!hash || !hash.includes("error")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const error = params.get("error");
    const errorCode = params.get("error_code");
    const description = params.get("error_description");

    if (!error && !errorCode && !description) return;

    const query = new URLSearchParams();
    if (error) query.set("error", error);
    if (errorCode) query.set("error_code", errorCode);
    if (description) query.set("error_description", description);

    router.replace(`/update-password?${query.toString()}`);
  }, [router]);

  return null;
}
