import { PRIVACY_CHOICE_KEY } from "../components/CookieConsent";

export type AnalyticsEventType = "page_view" | "model_interest";

export function trackAnalyticsEvent({
  path,
  tractorSlug,
  eventType,
}: {
  path: string;
  tractorSlug?: string;
  eventType: AnalyticsEventType;
}) {
  if (typeof window === "undefined" || window.localStorage.getItem(PRIVACY_CHOICE_KEY) !== "analytics") return;
  let visitorId = window.localStorage.getItem("atadan_visitor");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    window.localStorage.setItem("atadan_visitor", visitorId);
  }
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      tractorSlug,
      eventType,
      visitorId,
      region: window.sessionStorage.getItem("atadan-region") || "",
    }),
    keepalive: true,
  });
}
