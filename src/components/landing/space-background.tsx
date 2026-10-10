"use client";

import { useEffect, useRef } from "react";

export function SpaceBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.045;
      currentY += (targetY - currentY) * 0.045;
      root.style.setProperty("--mouse-x", currentX.toFixed(4));
      root.style.setProperty("--mouse-y", currentY.toFixed(4));
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    if (!reducedMotion) frame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="space-background" aria-hidden="true">
      <div className="space-background-stars space-background-stars-far" />
      <div className="space-background-stars space-background-stars-near" />
      <div className="space-background-nebula space-background-nebula-blue" />
      <div className="space-background-nebula space-background-nebula-violet" />
      <div className="space-background-planet">
        <div className="space-background-planet-ring" />
        <div className="space-background-planet-shine" />
      </div>
      <div className="space-background-comet space-background-comet-one" />
      <div className="space-background-comet space-background-comet-two" />
      <div className="space-background-cursor-glow" />
    </div>
  );
}
