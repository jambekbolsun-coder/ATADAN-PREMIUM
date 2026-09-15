"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.08,
      smoothWheel: true,
      wheelMultiplier: 0.82,
      syncTouch: false,
      anchors: { offset: -96 },
    });
    const syncVisibility = () => document.hidden ? lenis.stop() : lenis.start();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      lenis.destroy();
    };
  }, []);

  return null;
}
