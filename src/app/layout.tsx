import type { Metadata } from "next"; // ★ 移除了用不到的 Viewport 型別
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ★ 1. 重新命名變數，強制繞過 Next.js 的字體快取衝突 Bug
const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ★ 2. Metadata 設定
export const metadata: Metadata = {
  title: "Gold Land Auto DMS", 
  description: "Vehicle Management System for Gold Land Auto",
  manifest: "/manifest.json", 
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
    <html lang="zh-HK">
      <head>
        {/* ★ 3. 終極全面屏解鎖 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#f1f5f9" />

        {/* ★ 4. 補回：Windows 智能降維探測腳本 (解決 Chrome 破圖) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (navigator.userAgent.indexOf('Windows') !== -1) {
                document.documentElement.classList.add('is-windows');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
