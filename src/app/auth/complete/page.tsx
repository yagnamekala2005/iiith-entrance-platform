import { Suspense } from "react";
import AuthCompleteClient from "./auth-complete-client";

function AuthCompleteLoading() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        <p className="mt-4 text-sm font-semibold">
          Completing Google sign-in...
        </p>
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<AuthCompleteLoading />}>
      <AuthCompleteClient />
    </Suspense>
  );
}
