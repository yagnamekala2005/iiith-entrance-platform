"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RecoveryHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const getParam = (key: string) => hashParams.get(key) ?? queryParams.get(key);

    const code = queryParams.get("code");
    const error = getParam("error");
    const errorCode = getParam("error_code");
    const description = getParam("error_description");

    // Some Supabase email templates redirect to the site root with a PKCE
    // code. Send that code through the server callback so it can establish the
    // recovery session before the Update Password page loads.
    if (code) {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("flow", "recovery");
      callback.searchParams.set("next", "/update-password");
      callback.searchParams.set("code", code);
      window.location.replace(callback.toString());
      return;
    }

    const isRecoveryError =
      errorCode === "otp_expired" ||
      (error === "access_denied" &&
        (description?.toLowerCase().includes("email link") ?? false));

    if (!isRecoveryError) return;

    const query = new URLSearchParams();
    if (error) query.set("error", error);
    if (errorCode) query.set("error_code", errorCode);
    if (description) query.set("error_description", description);

    router.replace(`/update-password?${query.toString()}`);
  }, [router]);

  return null;
}
