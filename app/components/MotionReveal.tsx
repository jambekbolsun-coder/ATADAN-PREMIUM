"use client";

import { animate, stagger } from "animejs";
import { useEffect, useRef } from "react";

export function MotionReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = ref.current.querySelectorAll("[data-reveal]");
    animate(targets, { opacity: [0, 1], y: [24, 0], duration: 700, delay: stagger(80), ease: "outExpo" });
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
