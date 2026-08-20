"use client";

import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { I18nProvider } from "./I18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return children;
  return <I18nProvider><SiteHeader /><AnalyticsTracker />{children}<SiteFooter /></I18nProvider>;
}
