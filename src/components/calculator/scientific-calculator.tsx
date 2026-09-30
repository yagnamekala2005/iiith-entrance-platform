"use client";

import React, { useState, useEffect } from "react";

interface ScientificCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubject?: string;
}

export function ScientificCalculator({
  isOpen,
  onClose,
  currentSubject = "STEM",
}: ScientificCalculatorProps) {
  const [expression, setExpression] = useState<string>("");
  const [displayResult, setDisplayResult] = useState<string>("0");
  const [angleMode, setAngleMode] = useState<"deg" | "rad">("deg");
  const [memory, setMemory] = useState<number>(0);
  const [hasCalculated, setHasCalculated] = useState<boolean>(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Append character or operator
  const handleInput = (val: string) => {
    if (hasCalculated) {
      // If we just calculated and user inputs an operator, continue with answer
      if (["+", "-", "*", "/", "%", "^"].includes(val)) {
        setExpression(displayResult + val);
        setHasCalculated(false);
        return;
      } else {
        // Start fresh
        setExpression(val);
        setDisplayResult("0");
        setHasCalculated(false);
        return;
      }
    }

    setExpression((prev) => prev + val);
  };

  // Clear all
  const handleClear = () => {
    setExpression("");
    setDisplayResult("0");
    setHasCalculated(false);
  };

  // Backspace
  const handleBackspace = () => {
    if (hasCalculated) {
      handleClear();
      return;
    }
    setExpression((prev) => prev.slice(0, -1));
  };

  // Factorial helper
  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= Math.min(n, 100); i++) res *= i;
    return res;
  };

  // Execute mathematical evaluation safely
  const handleEvaluate = () => {
    if (!expression.trim()) return;

    try {
      let expr = expression;

      // Replace constants
      expr = expr.replace(/π/g, "Math.PI");
      expr = expr.replace(/e(?![a-z])/g, "Math.E");

      // Replace power x^y with Math.pow
      expr = expr.replace(/(\d+(\.\d+)?)\s*\^\s*(\d+(\.\d+)?)/g, "Math.pow($1,$3)");

      // Trig conversion helper based on angleMode
      const toRad = angleMode === "deg" ? "(Math.PI/180)*" : "";

      // Replace trig functions
      expr = expr.replace(/sin\(/g, `Math.sin(${toRad}`);
      expr = expr.replace(/cos\(/g, `Math.cos(${toRad}`);
      expr = expr.replace(/tan\(/g, `Math.tan(${toRad}`);

      // Inverse trig
      if (angleMode === "deg") {
        expr = expr.replace(/asin\(/g, "(180/Math.PI)*Math.asin(");
        expr = expr.replace(/acos\(/g, "(180/Math.PI)*Math.acos(");
        expr = expr.replace(/atan\(/g, "(180/Math.PI)*Math.atan(");
      } else {
        expr = expr.replace(/asin\(/g, "Math.asin(");
        expr = expr.replace(/acos\(/g, "Math.acos(");
        expr = expr.replace(/atan\(/g, "Math.atan(");
      }

      // Logarithms and Roots
      expr = expr.replace(/ln\(/g, "Math.log(");
      expr = expr.replace(/log\(/g, "Math.log10(");
      expr = expr.replace(/sqrt\(/g, "Math.sqrt(");
      expr = expr.replace(/cbrt\(/g, "Math.cbrt(");
      expr = expr.replace(/abs\(/g, "Math.abs(");

      // Safe eval of arithmetic
      // Allow only numbers, math operators, Math functions, and parentheses
      if (/[^0-9+\-*/().%\s,MathPIEsincoatanlrqbpow]/.test(expr)) {
        throw new Error("Invalid expression");
      }

      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();

      if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
        // Format nicely (up to 8 decimal places)
        const formatted = Number.isInteger(result)
          ? result.toString()
          : Number(result.toFixed(8)).toString();
        setDisplayResult(formatted);
        setHasCalculated(true);
      } else {
        setDisplayResult("Error");
      }
    } catch {
      setDisplayResult("Syntax Error");
    }
  };

  // Scientific function appender
  const applyFunc = (fnName: string) => {
    if (hasCalculated) {
      setExpression(`${fnName}(${displayResult})`);
      setHasCalculated(false);
    } else {
      setExpression((prev) => `${prev}${fnName}(`);
    }
  };

  // Single operand operations
  const applyInstant = (op: "square" | "cube" | "inv" | "neg" | "fact") => {
    try {
      const currentVal = parseFloat(displayResult) || (expression ? parseFloat(expression) : 0);
      let res = 0;
      if (op === "square") res = currentVal * currentVal;
      if (op === "cube") res = currentVal * currentVal * currentVal;
      if (op === "inv") res = currentVal !== 0 ? 1 / currentVal : NaN;
      if (op === "neg") res = -currentVal;
      if (op === "fact") res = factorial(Math.floor(currentVal));

      const formatted = Number.isInteger(res) ? res.toString() : Number(res.toFixed(8)).toString();
      setDisplayResult(formatted);
      setExpression(formatted);
      setHasCalculated(true);
    } catch {
      setDisplayResult("Error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center sm:justify-end p-2 sm:p-6 sm:pr-8 animate-in fade-in duration-200 font-sans">
      <div className="pointer-events-auto w-full max-w-[340px] sm:max-w-[380px] rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 cursor-grab">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black">
              🧮
            </span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">
                Scientific Calculator
              </h4>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                {currentSubject} Exam Tool
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Deg/Rad Toggle */}
            <button
              type="button"
              onClick={() => setAngleMode(angleMode === "deg" ? "rad" : "deg")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                angleMode === "deg"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Toggle Degree / Radian Mode"
            >
              {angleMode}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-rose-900/60 hover:text-white transition-all text-xs font-bold"
              aria-label="Close Calculator"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 text-right">
          <div className="min-h-[20px] text-xs font-mono text-slate-400 overflow-x-auto no-scrollbar whitespace-nowrap">
            {expression || "0"}
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-mono font-black tracking-tight text-white overflow-x-auto no-scrollbar whitespace-nowrap">
            {displayResult}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="p-3 bg-slate-900 grid grid-cols-5 gap-1.5 text-xs font-bold">
          {/* Row 1: Trig & Clear */}
          <button
            type="button"
            onClick={() => applyFunc("sin")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            sin
          </button>
          <button
            type="button"
            onClick={() => applyFunc("cos")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            cos
          </button>
          <button
            type="button"
            onClick={() => applyFunc("tan")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            tan
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="rounded-lg bg-slate-800 py-2.5 text-amber-400 hover:bg-slate-700 active:scale-95"
            title="Backspace"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg bg-rose-600/30 text-rose-300 border border-rose-500/40 py-2.5 hover:bg-rose-600 hover:text-white active:scale-95"
          >
            AC
          </button>

          {/* Row 2: Inverse Trig & Roots */}
          <button
            type="button"
            onClick={() => applyFunc("asin")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95 text-[11px]"
          >
            sin⁻¹
          </button>
          <button
            type="button"
            onClick={() => applyFunc("acos")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95 text-[11px]"
          >
            cos⁻¹
          </button>
          <button
            type="button"
            onClick={() => applyFunc("atan")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95 text-[11px]"
          >
            tan⁻¹
          </button>
          <button
            type="button"
            onClick={() => applyFunc("sqrt")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            √x
          </button>
          <button
            type="button"
            onClick={() => handleInput("/")}
            className="rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 py-2.5 hover:bg-blue-600 hover:text-white active:scale-95 text-sm"
          >
            ÷
          </button>

          {/* Row 3: Log, Exp, 7, 8, 9, * */}
          <button
            type="button"
            onClick={() => applyFunc("ln")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            ln
          </button>
          <button
            type="button"
            onClick={() => handleInput("7")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleInput("8")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleInput("9")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleInput("*")}
            className="rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 py-2.5 hover:bg-blue-600 hover:text-white active:scale-95 text-sm"
          >
            ×
          </button>

          {/* Row 4: Log10, Powers, 4, 5, 6, - */}
          <button
            type="button"
            onClick={() => applyFunc("log")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            log
          </button>
          <button
            type="button"
            onClick={() => handleInput("4")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleInput("5")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleInput("6")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleInput("-")}
            className="rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 py-2.5 hover:bg-blue-600 hover:text-white active:scale-95 text-sm"
          >
            −
          </button>

          {/* Row 5: x^y, 1, 2, 3, + */}
          <button
            type="button"
            onClick={() => handleInput("^")}
            className="rounded-lg bg-slate-800 py-2.5 text-sky-400 hover:bg-slate-700 active:scale-95"
          >
            xʸ
          </button>
          <button
            type="button"
            onClick={() => handleInput("1")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleInput("2")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleInput("3")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleInput("+")}
            className="rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 py-2.5 hover:bg-blue-600 hover:text-white active:scale-95 text-sm"
          >
            +
          </button>

          {/* Row 6: Constants, 0, ., =, ( ) */}
          <button
            type="button"
            onClick={() => handleInput("π")}
            className="rounded-lg bg-slate-800 py-2.5 text-purple-400 hover:bg-slate-700 active:scale-95"
          >
            π
          </button>
          <button
            type="button"
            onClick={() => handleInput("e")}
            className="rounded-lg bg-slate-800 py-2.5 text-purple-400 hover:bg-slate-700 active:scale-95"
          >
            e
          </button>
          <button
            type="button"
            onClick={() => handleInput("0")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleInput(".")}
            className="rounded-lg bg-slate-800/80 py-2.5 text-white hover:bg-slate-700 active:scale-95 text-sm"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEvaluate}
            className="rounded-lg bg-emerald-600 py-2.5 text-white font-black hover:bg-emerald-500 active:scale-95 text-sm shadow-md"
          >
            =
          </button>

          {/* Row 7: Instant shortcuts */}
          <button
            type="button"
            onClick={() => handleInput("(")}
            className="rounded-lg bg-slate-800 py-2 text-slate-300 hover:bg-slate-700 active:scale-95 text-xs"
          >
            (
          </button>
          <button
            type="button"
            onClick={() => handleInput(")")}
            className="rounded-lg bg-slate-800 py-2 text-slate-300 hover:bg-slate-700 active:scale-95 text-xs"
          >
            )
          </button>
          <button
            type="button"
            onClick={() => applyInstant("square")}
            className="rounded-lg bg-slate-800 py-2 text-sky-400 hover:bg-slate-700 active:scale-95 text-xs"
          >
            x²
          </button>
          <button
            type="button"
            onClick={() => applyInstant("inv")}
            className="rounded-lg bg-slate-800 py-2 text-sky-400 hover:bg-slate-700 active:scale-95 text-xs"
          >
            1/x
          </button>
          <button
            type="button"
            onClick={() => applyInstant("neg")}
            className="rounded-lg bg-slate-800 py-2 text-slate-300 hover:bg-slate-700 active:scale-95 text-xs"
          >
            ±
          </button>
        </div>

        {/* Footer Note */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Standard CBT Virtual Calculator</span>
          <span>Disabled for Aptitude</span>
        </div>
      </div>
    </div>
  );
}

