"use client";

import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { I18nProvider } from "./I18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SiteAssist } from "./SiteAssist";
import { CookieConsent } from "./CookieConsent";
import type { SiteFaq } from "./SiteAssist";
import { PwaRegistration } from "./PwaRegistration";
import { SmoothScroll } from "./SmoothScroll";
import { PageTransitionLoader } from "./PageTransitionLoader";
import type { Locale } from "../types";

export function AppChrome({ children,faqs=[],locale }: { children: React.ReactNode;faqs?:SiteFaq[];locale:Locale }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <I18nProvider initialLocale={locale}><PwaRegistration admin/>{children}</I18nProvider>;
  return <I18nProvider initialLocale={locale}><PwaRegistration/><SmoothScroll/><PageTransitionLoader key={pathname}/><a className="skip-link" href="#main-content">Перейти к содержанию</a><SiteHeader /><AnalyticsTracker /><div id="main-content" tabIndex={-1}>{children}</div><SiteFooter /><SiteAssist faqs={faqs}/><CookieConsent /></I18nProvider>;
}
