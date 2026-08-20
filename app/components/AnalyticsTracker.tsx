"use client";

import { useEffect } from "react";

export function AnalyticsTracker() {
  useEffect(() => {
    const pathname = window.location.pathname;
    const parts = pathname.split("/").filter(Boolean);
    const tractorSlug = parts[0] === "catalog" && parts.length === 2 ? parts[1] : undefined;
    let visitorId = localStorage.getItem("atadan_visitor");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("atadan_visitor", visitorId);
    }
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, tractorSlug, eventType: "page_view", visitorId }),
      keepalive: true,
    });
  }, []);
  return null;
}
