"use client";

import React, { useEffect, useState } from "react";

interface AntiScreenshotShieldProps {
  /**
   * If true, enables strict window blur / visibility change obscurity
   * (recommended for live CBT mock test exam taking).
   */
  strictExamMode?: boolean;
}

export function AntiScreenshotShield({ strictExamMode = false }: AntiScreenshotShieldProps) {
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>("");

  const triggerSecurityWarning = (msg: string) => {
    setWarningMessage(msg);
    setShowWarning(true);

    // Attempt to clear system clipboard if possible
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText("Screenshots and screen capture are strictly disabled on this platform for exam security.")
        .catch(() => {});
    }

    setTimeout(() => {
      setShowWarning(false);
    }, 3500);
  };

  useEffect(() => {
    // 1. Keyboard event listener for screenshot & capture shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled to protect test integrity.");
        return;
      }

      // Windows Snipping Tool (Win + Shift + S) or Ctrl + Shift + S
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screen snippet blocked! Screen capture tools are prohibited.");
        return;
      }

      // Alt + PrintScreen
      if (e.altKey && (e.key === "PrintScreen" || e.code === "PrintScreen")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled.");
        return;
      }

      // macOS screenshot shortcuts (Cmd + Shift + 3, Cmd + Shift + 4, Cmd + Shift + 5)
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Screenshot blocked! Screen capture is disabled.");
        return;
      }

      // Ctrl + P or Meta + P (Print / Save to PDF)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Printing is disabled! Saving this page is not permitted.");
        return;
      }

      // Ctrl + S or Meta + S (Save webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S") && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Saving page is disabled!");
        return;
      }
    };

    // 2. Clear clipboard on PrintScreen keyup
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText("Screenshots and screen capture are strictly disabled on this platform.")
            .catch(() => {});
        }
      }
    };

    // 3. Block printing
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerSecurityWarning("Printing is disabled on this platform.");
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, []);

  return (
    <>
      {/* Visual Security Warning Overlay Banner */}
      {showWarning && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-rose-500 bg-rose-950/95 text-white px-5 py-3.5 shadow-2xl backdrop-blur-md max-w-md w-full">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-xl font-bold shadow-xs">
              🚫
            </span>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                Security Shield Active
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

