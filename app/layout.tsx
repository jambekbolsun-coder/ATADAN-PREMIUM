import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppChrome } from "./components/AppChrome";
import { getSiteSettings } from "./lib/site-settings";
import { SiteSettingsProvider } from "./components/SiteSettings";
import { getPublishedRecords } from "./lib/public-records";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atadan.bekbolsunjamshutov.chatgpt.site"),
  title: "ATADAN Changfa — тракторы в Кыргызстане",
  description: "Официальный дистрибьютор тракторов Changfa. Подбор техники, лизинг, гарантия и сервис в Кыргызстане.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "ATADAN Changfa — тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa от 50 до 240 л.с., лизинг, гарантия и сервис.",
    type: "website",
    locale: "ru_KG",
    images: [{ url: "/images/hero/atadan-field-wide.png", width: 1916, height: 817, alt: "Трактор Changfa в поле — ATADAN" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATADAN Changfa — тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa от 50 до 240 л.с., лизинг, гарантия и сервис.",
    images: ["/images/hero/atadan-field-wide.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ settings },faqRecords] = await Promise.all([getSiteSettings(),getPublishedRecords("faq")]);
  const faqs=faqRecords.map(record=>({id:record.id,question:record.data.question||record.title,answer:record.data.answer||record.subtitle,buttonLabel:record.data.buttonLabel,buttonUrl:record.data.buttonUrl})).filter(item=>item.question&&item.answer);
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased"><SiteSettingsProvider value={settings}><AppChrome faqs={faqs}>{children}</AppChrome></SiteSettingsProvider></body>
    </html>
  );
}
