"use client";

import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { I18nProvider } from "./I18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SiteAssist } from "./SiteAssist";
import { CookieConsent } from "./CookieConsent";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <I18nProvider>{children}</I18nProvider>;
  return <I18nProvider><a className="skip-link" href="#main-content">Перейти к содержанию</a><SiteHeader /><AnalyticsTracker /><div id="main-content" tabIndex={-1}>{children}</div><SiteFooter /><SiteAssist /><CookieConsent /></I18nProvider>;
}
