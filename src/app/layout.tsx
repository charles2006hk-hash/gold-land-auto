import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ★★★ 1. Viewport 設定：保持您的設定，鎖死縮放，顏色與系統一致 ★★★
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a', // 與您的 manifest 背景顏色一致
};

// ★★★ 2. Metadata 設定：加入圖示路徑 ★★★
export const metadata: Metadata = {
  title: "Gold Land Auto DMS", 
  description: "Vehicle Management System for Gold Land Auto",
  manifest: "/manifest.json", 
  // ★ 加入以下 icons 設定，確保瀏覽器分頁與 iOS 桌面圖示正確讀取
  icons: {
    icon: '/GL_APPLOGO.png',
    apple: '/GL_APPLOGO.png',
  },
  appleWebApp: {
    capable: true, 
    title: "金田 DMS",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK"> {/* 建議改為 zh-HK 或 zh-TW */}
      <head>
        {/* 這裡可以放其他需要手動加入的 head 標籤 */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
