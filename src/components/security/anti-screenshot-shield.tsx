"use client";

import React, { useEffect, useState } from "react";

interface AntiScreenshotShieldProps {
  /**
   * If true, enables strict window blur / visibility change obscurity
   * (recommended for live CBT mock test exam taking).
   */
  strictExamMode?: boolean;
}

/**
 * Detects whether the current environment is a mobile phone (Android app, iOS app, or mobile browser)
 * Returns false on laptops, desktops, and PCs.
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Capacitor native mobile app check
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (cap && (cap.isNativePlatform?.() || cap.getPlatform?.() === "android" || cap.getPlatform?.() === "ios")) {
    return true;
  }

  // 2. Mobile User-Agent check (Android, iPhone, iPad, iPod, etc.)
  const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
  if (isMobileUA) {
    return true;
  }

  // 3. Touch device with mobile phone screen width
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 820;

  return isTouchDevice && isSmallScreen;
}

export function AntiScreenshotShield({ strictExamMode = false }: AntiScreenshotShieldProps) {
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>("");
  const [isScreenObscured, setIsScreenObscured] = useState<boolean>(false);

  const triggerSecurityWarning = (msg: string) => {
    setWarningMessage(msg);
    setShowWarning(true);

    // Attempt to clear system clipboard on mobile if screenshot text is captured
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText("Screenshots and screen capture are strictly disabled on this mobile app.")
        .catch(() => {});
    }

    setTimeout(() => {
      setShowWarning(false);
    }, 3500);
  };

  useEffect(() => {
    // IMPORTANT: If on a laptop / desktop, DO NOT apply any restrictions!
    // Laptops must allow DevTools inspect and screenshots freely.
    if (!isMobileDevice()) {
      return;
    }

    // --- MOBILE PHONE SPECIFIC SCREENSHOT & CAPTURE RESTRICTIONS ---

    // 1. Keyboard event listener for mobile screenshot & capture shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled on mobile app.");
        return;
      }

      // Windows/Mobile Snipping shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screen snippet blocked! Screen capture is disabled on mobile app.");
        return;
      }

      // Alt + PrintScreen
      if (e.altKey && (e.key === "PrintScreen" || e.code === "PrintScreen")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled on mobile app.");
        return;
      }

      // macOS/iOS screenshot shortcuts (Cmd + Shift + 3, 4, 5)
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled on mobile app.");
        return;
      }
    };

    // 2. Clear clipboard on PrintScreen keyup on mobile
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText("Screenshots and screen capture are strictly disabled on this mobile app.")
            .catch(() => {});
        }
      }
    };

    // 3. Obscure screen on blur / visibility change when mobile screenshot or task switcher is activated
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState !== "visible") {
        setIsScreenObscured(true);
      } else {
        // When user returns to mobile app, remove obscurity overlay
        setIsScreenObscured(false);
      }
    };

    const handleWindowBlur = () => {
      // On mobile devices, window blur happens when screenshot gestures or split-screen/screen-capture overlay triggers
      if (strictExamMode) {
        setIsScreenObscured(true);
      }
    };

    const handleWindowFocus = () => {
      setIsScreenObscured(false);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [strictExamMode]);

  return (
    <>
      {/* Mobile Screen Obscurity Shield (blocks background screen captures & task previews) */}
      {isScreenObscured && (
        <div className="fixed inset-0 z-[99998] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white pointer-events-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/20 border border-rose-500/30 text-3xl mb-4">
            🔒
          </div>
          <h3 className="text-lg font-black tracking-tight text-white">
            Mobile Screen Capture Prohibited
          </h3>
          <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed">
            Screenshots and screen recording are disabled on this mobile app to protect test integrity and questions.
          </p>
        </div>
      )}

      {/* Visual Security Warning Overlay Banner on Mobile */}
      {showWarning && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-rose-500 bg-rose-950/95 text-white px-5 py-3.5 shadow-2xl backdrop-blur-md max-w-md w-full">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-xl font-bold shadow-xs">
              🚫
            </span>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                Mobile Security Shield Active
              </h4>
              <p className="mt-0.5 text-xs text-rose-100 font-medium leading-snug">
                {warningMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="rounded-lg p-1 text-rose-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
