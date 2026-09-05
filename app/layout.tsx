import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";

import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "紫微 AI 觀星 | 娛樂用途解讀",
  description:
    "輸入生辰，取得紫微斗數 AI 基本摘要。本服務僅供娛樂，不作為醫療、法律、財務或重大人生決策依據。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={notoSansTC.variable}>
      <body className="min-h-screen bg-background text-on-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
