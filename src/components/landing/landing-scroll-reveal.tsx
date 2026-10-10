"use client";

import { useEffect } from "react";

export function LandingScrollReveal() {
  useEffect(() => {
    const items = Array.from(
      document.querySelectorAll<HTMLElement>(".landing-page .reveal-on-scroll")
    );
    if (!items.length) return;

    document.documentElement.classList.add("scroll-reveal-ready");

    items.forEach((item, index) => {
      item.style.setProperty("--reveal-delay", `${(index % 4) * 90}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("scroll-reveal-ready");
    };
  }, []);

  return null;
}
