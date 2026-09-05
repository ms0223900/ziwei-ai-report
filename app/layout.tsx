import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";

import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
});

const notoSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-noto-serif-tc",
  display: "swap",
  preload: false,
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "紫微解讀 | 娛樂用途",
  description:
    "輸入生辰，先看紫微基本分析。本服務僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${notoSansTC.variable} ${notoSerifTC.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-on-background antialiased">
        {children}
      </body>
    </html>
  );
}
