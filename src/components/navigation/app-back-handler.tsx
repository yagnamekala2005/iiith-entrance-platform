"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AppBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const lastPressRef = useRef<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Handler for hardware/gesture backbutton event fired by Capacitor/Cordova webview bridge
    const handleHardwareBack = (e: Event) => {
      e.preventDefault();

      // If user is currently in a live exam attempt, let TakingInterface handle its own paused exit modal
      if (
        pathname.startsWith("/attempts/") &&
        !pathname.endsWith("/result") &&
        !pathname.endsWith("/review")
      ) {
        return;
      }

      // Root pages: Landing ('/') or direct Auth ('/login')
      if (pathname === "/" || pathname === "/login") {
        const now = Date.now();
        if (now - lastPressRef.current < 2000) {
          // Double press confirmed: allow native exit if Capacitor is present
          const cap = (window as unknown as { Capacitor?: { Plugins?: { App?: { exitApp?: () => void } } } }).Capacitor;
          if (cap?.Plugins?.App?.exitApp) {
            cap.Plugins.App.exitApp();
          }
        } else {
          lastPressRef.current = now;
          setToastMessage("Press back again to exit");
          setTimeout(() => setToastMessage(null), 2000);
        }
        return;
      }

      // On Student Dashboard: 1 step back returns to Entrance Home Portal
      if (pathname === "/dashboard") {
        router.push("/");
        return;
      }

      // On Student Sub-pages: Return 1 step back to Dashboard or previous page
      if (
        pathname === "/learning" ||
        pathname.startsWith("/tests") ||
        pathname.startsWith("/attempts") ||
        pathname.startsWith("/practice")
      ) {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // On Admin Studio pages: Return 1 step back to Dashboard or previous page
      if (pathname.startsWith("/admin")) {
        if (pathname === "/admin") {
          router.push("/dashboard");
        } else {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
          } else {
            router.push("/admin");
          }
        }
        return;
      }

      // Default safe fallback: step back in history or return to Entrance Portal
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
      } else {
        router.push("/");
      }
    };

    document.addEventListener("backbutton", handleHardwareBack, false);

    return () => {
      document.removeEventListener("backbutton", handleHardwareBack, false);
    };
  }, [pathname, router]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in duration-150">
      <div className="rounded-full bg-slate-900/95 text-white text-xs font-semibold px-4 py-2 shadow-2xl backdrop-blur-md border border-slate-700">
        {toastMessage}
      </div>
    </div>
  );
}

