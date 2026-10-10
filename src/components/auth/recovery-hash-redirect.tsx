"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RecoveryHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Supabase may put recovery errors in either the query string or URL
    // fragment. The fragment is client-only, so inspect both before rendering
    // the homepage as the destination.
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const getParam = (key: string) => hashParams.get(key) ?? queryParams.get(key);

    const error = getParam("error");
    const errorCode = getParam("error_code");
    const description = getParam("error_description");

    // Only redirect Supabase auth errors that indicate a recovery-link failure.
    // Do not intercept unrelated query parameters on the homepage.
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
