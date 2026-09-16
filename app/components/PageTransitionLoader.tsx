"use client";

import { useEffect, useRef, useState } from "react";
import { AtadanLoader } from "./AtadanLoader";

export function PageTransitionLoader() {
  const [visible, setVisible] = useState(false);
  const navigating = useRef(false);

  useEffect(() => {
    let fallbackTimer: number | undefined;
    const reset = () => {
      window.clearTimeout(fallbackTimer);
      navigating.current = false;
      setVisible(false);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || navigating.current) return;
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const sameDocument = destination.pathname === window.location.pathname && destination.search === window.location.search;
      if (sameDocument) return;

      navigating.current = true;
      setVisible(true);
      fallbackTimer = window.setTimeout(reset, 6000);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", reset);
    return () => {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  return visible ? <AtadanLoader className="atadan-loader-transition" detail="Открываем следующий раздел" /> : null;
}
