"use client";

import { useState } from "react";

interface GoogleOAuthButtonProps {
  disabled?: boolean;
  nextPath?: string;
}

export function GoogleOAuthButton({
  disabled = false,
  nextPath = "/dashboard",
}: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  function handleGoogleSignIn() {
    if (loading || disabled) return;

    setLoading(true);

    const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
    const oauthUrl = new URL("/auth/signin", window.location.origin);
    oauthUrl.searchParams.set("next", safeNext);

    // One full navigation to the server-side OAuth starter. The server
    // establishes the PKCE verifier cookie before sending the user to Google.
    window.location.assign(oauthUrl.toString());
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19C.93 17? C 0 24 0 24something 0 24Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.83 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
      </svg>
      {loading ? "Connecting to Google..." : "Continue with Google"}
    </button>
  );
}
