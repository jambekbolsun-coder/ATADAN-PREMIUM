import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppChrome } from "./components/AppChrome";

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
  description: "Официальный дистрибьютор тракторов Changfa. Подбор техники, рассрочка, гарантия и сервис в Кыргызстане.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "ATADAN Changfa — тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa от 50 до 240 л.с., рассрочка, гарантия и сервис.",
    type: "website",
    locale: "ru_KG",
    images: [{ url: "/images/hero/atadan-field-wide.png", width: 1916, height: 817, alt: "Трактор Changfa в поле — ATADAN" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATADAN Changfa — тракторы в Кыргызстане",
    description: "Каталог тракторов Changfa от 50 до 240 л.с., рассрочка, гарантия и сервис.",
    images: ["/images/hero/atadan-field-wide.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased"><AppChrome>{children}</AppChrome></body>
    </html>
  );
}
