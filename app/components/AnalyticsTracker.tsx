"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PRIVACY_CHOICE_EVENT, PRIVACY_CHOICE_KEY } from "./CookieConsent";

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let sent = false;
    function send() {
      if (sent || window.localStorage.getItem(PRIVACY_CHOICE_KEY) !== "analytics") return;
      sent = true;
      const parts = pathname.split("/").filter(Boolean);
      const tractorSlug = parts[0] === "catalog" && parts.length === 2 ? parts[1] : undefined;
      let visitorId = window.localStorage.getItem("atadan_visitor");
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        window.localStorage.setItem("atadan_visitor", visitorId);
      }
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, tractorSlug, eventType: "page_view", visitorId }),
        keepalive: true,
      });
    }
    send();
    window.addEventListener(PRIVACY_CHOICE_EVENT, send);
    return () => window.removeEventListener(PRIVACY_CHOICE_EVENT, send);
  }, [pathname]);
  return null;
}
