import { Suspense } from "react";
import { MobileSignIn } from "@/components/auth/mobile-sign-in";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E3AE3] border-t-transparent" />
        </div>
      }
    >
      <MobileSignIn />
    </Suspense>
  );
}
