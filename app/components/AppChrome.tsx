"use client";

import { usePathname } from "next/navigation";
import { AnalyticsTracker } from "./AnalyticsTracker";
import { I18nProvider, useI18n } from "./I18n";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { SiteAssist } from "./SiteAssist";
import { CookieConsent } from "./CookieConsent";
import type { LeaseSummary, SiteFaq } from "./SiteAssist";
import { PublicPwaCleanup } from "./PwaRegistration";
import { SmoothScroll } from "./SmoothScroll";
import { PageTransitionLoader } from "./PageTransitionLoader";
import type { Locale } from "../types";

function SkipLink() {
  const { t } = useI18n();
  return <a className="skip-link" href="#main-content">{t("ui.skipLink")}</a>;
}

export function AppChrome({ children,faqs=[],lease=null,locale }: { children: React.ReactNode;faqs?:SiteFaq[];lease?:LeaseSummary|null;locale:Locale }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
  return <I18nProvider initialLocale={locale}><PublicPwaCleanup/><SmoothScroll/><PageTransitionLoader key={pathname}/><SkipLink /><SiteHeader /><AnalyticsTracker /><div id="main-content" tabIndex={-1}>{children}</div><SiteFooter /><SiteAssist faqs={faqs} lease={lease}/><CookieConsent /></I18nProvider>;
}
