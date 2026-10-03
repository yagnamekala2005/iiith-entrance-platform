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
  const [isWindowObscured, setIsWindowObscured] = useState<boolean>(false);

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

      // Ctrl + U or Meta + U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Page source inspection is disabled.");
        return;
      }

      // DevTools shortcuts (F12, Ctrl + Shift + I/J/C)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "I", "j", "J", "c", "C"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityWarning("Developer inspection tools are disabled during tests.");
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

    // 3. Block Right-Click context menu
    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu only if user is clicking on an editable input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      triggerSecurityWarning("Right-click is disabled on this platform.");
    };

    // 4. Block copy / cut on protected content
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      triggerSecurityWarning("Copying text is disabled to maintain exam integrity.");
    };

    // 5. Block printing
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerSecurityWarning("Printing is disabled on this platform.");
    };

    // 6. Strict exam window focus / visibility handling
    const handleVisibilityChange = () => {
      if (strictExamMode) {
        if (document.hidden) {
          setIsWindowObscured(true);
        } else {
          setIsWindowObscured(false);
        }
      }
    };

    const handleWindowBlur = () => {
      if (strictExamMode) {
        setIsWindowObscured(true);
      }
    };

    const handleWindowFocus = () => {
      if (strictExamMode) {
        setIsWindowObscured(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    window.addEventListener("beforeprint", handleBeforePrint);

    if (strictExamMode) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleWindowBlur);
      window.addEventListener("focus", handleWindowFocus);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      window.removeEventListener("beforeprint", handleBeforePrint);

      if (strictExamMode) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("focus", handleWindowFocus);
      }
    };
  }, [strictExamMode]);

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

      {/* Strict Exam Mode Privacy Curtain (Obscures screen if capture tool or app switcher activates) */}
      {strictExamMode && isWindowObscured && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950 p-6 text-center select-none">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-8 text-white shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20 text-3xl text-amber-400">
              🔒
            </div>
            <h3 className="mt-4 text-xl font-black text-white">
              Exam Security Screen Protected
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Test questions and options are concealed while the exam window is unfocused or an external capture tool is active.
            </p>
            <div className="mt-6">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs">
                Click back on this window to resume exam
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

