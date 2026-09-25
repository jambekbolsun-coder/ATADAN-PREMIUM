import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/customer-experience.css";
import { AppChrome } from "./components/AppChrome";
import { getSiteSettings } from "./lib/site-settings";
import { SiteSettingsProvider } from "./components/SiteSettings";
import { getPublishedRecords } from "./lib/public-records";
import { getRequestLocale } from "./lib/locale-server";
import { FALLBACK_IMAGE, jsonLd, SITE_URL } from "./lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atadan-changfa.vercel.app"),
  title: "ATADAN Changfa: тракторы в Кыргызстане",
  description: "Каталог тракторов Changfa, подбор техники, финансирование, новости и сервис ATADAN в Кыргызстане.",
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/icons/atadan-app-192.png", type: "image/png", sizes: "192x192" }],
    shortcut: "/icons/atadan-app-192.png",
    apple: "/icons/atadan-app-192.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "ATADAN Changfa: тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa, финансирование, новости и сервис ATADAN.",
    type: "website",
    locale: "ru_KG",
    images: [{ url: FALLBACK_IMAGE, width: 1916, height: 817, alt: "Трактор Changfa в поле: ATADAN" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATADAN Changfa: тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa, финансирование, новости и сервис ATADAN.",
    images: [FALLBACK_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ settings },faqRecords,locale] = await Promise.all([getSiteSettings(),getPublishedRecords("faq"),getRequestLocale()]);
  const faqs=faqRecords.map(record=>({id:record.id,question:record.data.question||record.title,answer:record.data.answer||record.subtitle,buttonLabel:record.data.buttonLabel,buttonUrl:record.data.buttonUrl})).filter(item=>item.question&&item.answer);
  const organization={"@context":"https://schema.org","@type":"Organization",name:"ATADAN",url:SITE_URL,logo:`${SITE_URL}/icons/atadan-app-512.png`,telephone:settings.phone,address:{"@type":"PostalAddress",streetAddress:settings.address,addressCountry:"KG"},sameAs:settings.instagram?[settings.instagram]:[]};
  const website={"@context":"https://schema.org","@type":"WebSite",name:"ATADAN",url:SITE_URL,inLanguage:["ru-KG","ky-KG","en"],potentialAction:{"@type":"SearchAction",target:`${SITE_URL}/catalog?search={search_term_string}`,"query-input":"required name=search_term_string"}};
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(organization)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(website)}}/><SiteSettingsProvider value={settings}><AppChrome faqs={faqs} locale={locale}>{children}</AppChrome></SiteSettingsProvider></body>
    </html>
  );
}
