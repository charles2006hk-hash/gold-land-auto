import type { Metadata, Viewport } from "next"; // ★ 1. 記得引入 Viewport
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

// ★★★ 2. 新增 Viewport 設定：鎖死縮放，防止雙擊放大 ★★★
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 絕對禁止雙擊放大
  themeColor: '#0f172a', // 讓頂部狀態列與系統融合 (slate-900 顏色)
};

// ★★★ 3. 升級 Metadata：加入 manifest 與完整 PWA 設定 ★★★
export const metadata: Metadata = {
  title: "Gold Land Auto DMS", 
  description: "Vehicle Management System for Gold Land Auto",
  manifest: "/manifest.json", // ★ 連結 PWA 描述檔，讓瀏覽器知道這是一個 App
  appleWebApp: {
    capable: true, // ★ 允許加入主畫面並隱藏 Safari 網址列/底部工具列
    title: "金田 DMS",
    statusBarStyle: "black-translucent", // 讓畫面延伸到頂部瀏海區
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
