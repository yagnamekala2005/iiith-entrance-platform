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
      root.style.setProperty("--parallax-far-x", `${(-currentX * 7).toFixed(2)}px`);
      root.style.setProperty("--parallax-far-y", `${(-currentY * 6).toFixed(2)}px`);
      root.style.setProperty("--parallax-near-x", `${(-currentX * 18).toFixed(2)}px`);
      root.style.setProperty("--parallax-near-y", `${(-currentY * 14).toFixed(2)}px`);
      root.style.setProperty("--parallax-blue-x", `${(currentX * 32).toFixed(2)}px`);
      root.style.setProperty("--parallax-blue-y", `${(currentY * 24).toFixed(2)}px`);
      root.style.setProperty("--parallax-violet-x", `${(-currentX * 38).toFixed(2)}px`);
      root.style.setProperty("--parallax-violet-y", `${(-currentY * 26).toFixed(2)}px`);
      root.style.setProperty("--parallax-planet-x", `${(-currentX * 24).toFixed(2)}px`);
      root.style.setProperty("--parallax-planet-y", `${(-currentY * 18).toFixed(2)}px`);
      root.style.setProperty("--cursor-glow-x", `${50 + currentX * 30}%`);
      root.style.setProperty("--cursor-glow-y", `${50 + currentY * 30}%`);
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
